import axios from "axios"
import crypto from "crypto"

const BASE_URL = "https://v2.chateverywhere.app/"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

function generateRandomId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let result = ""
    for (let i = 0; i < 16; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
    return result
}

async function chat(prompt, model = "gpt-3.5-turbo") {
    const submitId = `chat-v2-submit-${generateRandomId()}`

    // Step 1: POST to create chat session
    const payload = {
        submitId,
        startNewChat: true,
        content: prompt,
        newFileIds: [],
        clientTimeZone: "Asia/Jakarta",
        enabledTools: ["google-search", "web-browse", "memory"],
        mqttConnections: [],
        useBot: null,
        isSuggestion: false,
        chatMode: "default",
        imageGenerationModel: "nano-banana",
        consentedSessionId: null
    }

    const postRes = await axios.post(`${BASE_URL}api/chat`, payload, {
        headers: {
            "User-Agent": UA,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Referer": BASE_URL
        },
        timeout: 30000
    })

    const initData = postRes.data
    const chatHash = initData.chatHash

    if (!chatHash) {
        // If we got direct response text, return it
        if (initData.text || initData.content) {
            return { text: initData.text || initData.content }
        }
        throw new Error("No chatHash received from API")
    }

    // Step 2: GET stream response
    const streamRes = await axios.get(`${BASE_URL}api/chat/${chatHash}/stream`, {
        headers: { "User-Agent": UA, "Accept": "text/event-stream", "Referer": BASE_URL },
        timeout: 60000,
        responseType: "text"
    })

    const text = streamRes.data || ""
    let fullResponseText = ""

    for (const line of text.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("data:")) continue
        const rawData = trimmed.slice(5).trim()
        if (rawData === "[DONE]") break
        try {
            const parsed = JSON.parse(rawData)
            if (parsed.type === "text-delta" && parsed.delta) fullResponseText += parsed.delta
        } catch {}
    }

    return { text: fullResponseText || initData.text || JSON.stringify(initData) }
}

export default {
    route: {
        method: "get",
        path: "/ai/chateverywhere",
        auth: false,
        tags: ["AI"],
        summary: "ChatEverywhere — AI chat",
        description: "Chat with AI via chateverywhere.app. Supports various models.",
        parameters: [
            { name: "prompt", in: "query", required: true, description: "Your message/prompt", schema: { type: "string" } },
            { name: "model", in: "query", required: false, description: "AI model (default: gpt-3.5-turbo)", schema: { type: "string", default: "gpt-3.5-turbo" } },
        ],
        responses: {
            "200": { description: "OK" },
            "400": { description: "Bad request" }
        }
    },
    handler: async (req, res) => {
        const { prompt, model } = req.query
        if (!prompt) return res.status(400).json({ ok: false, error: "prompt wajib diisi" })
        try {
            const result = await chat(prompt.trim(), model || "gpt-3.5-turbo")
            res.json({ ok: true, result })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

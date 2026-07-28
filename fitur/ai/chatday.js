import axios from "axios"
import crypto from "crypto"

const BASE_URL = "https://www.chatday.ai/"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

async function createAnonymousSession() {
    const url = `${BASE_URL.replace(/$/, "")}/api/auth/sign-in/anonymous`
    const res = await axios.post(url, {}, {
        headers: { "User-Agent": UA, "Content-Type": "application/json", "Origin": BASE_URL.replace(/$/, ""), "Referer": BASE_URL },
        timeout: 15000
    })
    const cookies = res.headers["set-cookie"]
    const cookieStr = cookies ? cookies.map(c => c.split(";")[0]).join("; ") : ""
    return { cookie: cookieStr, user: res.data }
}

// Parse the SSE stream returned by chatday.ai and extract the assistant's reply text.
// Format: lines like `data: {"type":"text-delta","delta":"..."}` interleaved with
// `text-start` / `text-end` / `data-conversation` events. We concatenate all `delta`s.
function parseSSE(sseText) {
    let text = ""
    let conversationId = null
    for (const line of String(sseText || "").split("\n")) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("data:")) continue
        const raw = trimmed.slice(5).trim()
        if (!raw || raw === "[DONE]") continue
        try {
            const ev = JSON.parse(raw)
            if (ev.type === "data-conversation" && ev.data?.conversationId) {
                conversationId = ev.data.conversationId
            } else if (ev.type === "text-delta" && typeof ev.delta === "string") {
                text += ev.delta
            }
        } catch {}
    }
    return { text, conversationId }
}

async function chat(prompt, model = "openai/gpt-4o-mini") {
    const session = await createAnonymousSession()
    const cookie = session.cookie
    const conversationId = crypto.randomUUID()
    const visitorId = crypto.randomBytes(16).toString("hex")

    const chatUrl = `${BASE_URL.replace(/$/, "")}/api/v2/chat/anonymous`
    const res = await axios.post(chatUrl, {
        content: prompt,
        model,
        visitorId,
        conversationId
    }, {
        headers: {
            "User-Agent": UA, "Content-Type": "application/json", "Accept": "application/json",
            "Cookie": cookie, "Origin": BASE_URL.replace(/$/, ""), "Referer": BASE_URL
        },
        timeout: 30000,
        responseType: "text",  // chatday returns SSE text, not JSON
        transformResponse: [(data) => data],  // prevent axios from trying to parse
    })
    const parsed = parseSSE(res.data)
    return { response: parsed.text, conversationId: parsed.conversationId || conversationId, model }
}

export default {
    route: {
        method: "get",
        path: "/ai/chatday",
        auth: false,
        tags: ["AI"],
        summary: "Chatday AI — chat with various AI models",
        description: "Chat with AI models via chatday.ai. Supports models like openai/gpt-4o-mini, deepseek, etc.",
        parameters: [
            { name: "prompt", in: "query", required: true, description: "Your message/prompt", schema: { type: "string" } },
            { name: "model", in: "query", required: false, description: "AI model ID (default: openai/gpt-4o-mini)", schema: { type: "string", default: "openai/gpt-4o-mini" } },
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
            const result = await chat(prompt.trim(), model || "openai/gpt-4o-mini")
            res.json({ ok: true, result: result.response })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

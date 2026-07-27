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
        timeout: 30000
    })
    return { response: res.data, cookie, conversationId }
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

import axios from "axios"
import * as cheerio from "cheerio"

const PAGE_URL = "https://chat-deep.ai/deepseek-chat/"
const BOOTSTRAP_URL = "https://chat-deep.ai/wp-admin/admin-ajax.php?action=dsc_chat_bootstrap"
const CHAT_URL = "https://chat-deep.ai/wp-json/dsc/v1/chat"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

// chat-deep.ai v2 flow:
//   1. Visit page (get cookies + verify human-like)
//   2. POST to bootstrap URL → returns fresh nonce + quota info
//   3. POST to /wp-json/dsc/v1/chat with X-WP-Nonce header
async function getSession() {
    const jar = { cookies: {} }

    // Step 1: Visit page first to establish session (cookies, referer chain)
    const { data: html, status: pageStatus, headers: pageHeaders } = await axios.get(PAGE_URL, {
        headers: {
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,id;q=0.8"
        },
        validateStatus: () => true,
        maxRedirects: 5
    })
    if (pageStatus !== 200) throw new Error(`Gagal nembus halaman utama (HTTP ${pageStatus})`)

    // Save cookies
    const setCookies = pageHeaders["set-cookie"] || []
    for (const sc of setCookies) {
        const parts = sc.split(";")[0].split("=")
        if (parts.length >= 2) {
            jar.cookies[parts[0].trim()] = parts.slice(1).join("=").trim()
        }
    }
    const cookieHeader = Object.entries(jar.cookies).map(([k, v]) => `${k}=${v}`).join("; ")

    // Step 2: POST to bootstrap endpoint to get nonce
    const { data: boot, status: bootStatus } = await axios.post(BOOTSTRAP_URL, "", {
        headers: {
            "User-Agent": UA,
            "Accept": "application/json",
            "Origin": "https://chat-deep.ai",
            "Referer": PAGE_URL,
            "Content-Type": "application/x-www-form-urlencoded",
            ...(cookieHeader ? { "Cookie": cookieHeader } : {})
        },
        validateStatus: () => true,
        timeout: 15000
    })

    if (bootStatus !== 200 || !boot?.nonce) {
        throw new Error("Gagal mengambil WP-Nonce dari bootstrap endpoint")
    }

    // Region/quota check (chat-deep blocks EEA/UK/CH)
    if (boot.access && boot.access.chatEnabled === false) {
        throw new Error(`Region diblokir oleh chat-deep.ai (scope: ${boot.access.scope || "unknown"}). Coba endpoint alternatif: /ai/qwen, /ai/gemini, atau /ai/claude3`)
    }

    return { nonce: boot.nonce, cookieHeader, quota: boot }
}

async function chatDeep(prompt, { thinking = false } = {}) {
    const { nonce, cookieHeader, quota } = await getSession()

    const { data, status } = await axios.post(CHAT_URL, {
        messages: [
            { role: "user", content: prompt },
            { role: "assistant", content: "" }
        ],
        model: "deepseek-v4-flash",
        thinking
    }, {
        headers: {
            "User-Agent": UA,
            "X-WP-Nonce": nonce,
            ...(cookieHeader ? { "Cookie": cookieHeader } : {}),
            "Origin": "https://chat-deep.ai",
            "Referer": PAGE_URL,
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            "Accept-Language": "en-US,en;q=0.9,id;q=0.8"
        },
        validateStatus: () => true,
        responseType: "text",
        maxRedirects: 0
    })
    if (status !== 200) {
        if (status === 403) {
            throw new Error("chat-deep.ai menolak (HTTP 403, nonce invalid atau region diblokir). Coba endpoint alternatif: /ai/qwen atau /ai/gemini")
        }
        if (status === 429) {
            throw new Error(`Quota habis (limit: ${quota?.day?.limit || "?"}/hari). Coba lagi nanti atau gunakan /ai/qwen, /ai/gemini`)
        }
        throw new Error(`Gagal menghubungi AI (HTTP ${status})`)
    }

    let answer = ""
    let reasoning = ""
    let streamError = null
    let currentEvent = null

    for (const chunk of String(data).split("\n")) {
        const line = chunk.trim()
        if (!line) continue

        // SSE event tracking — chat-deep.ai v2 sends `event: error` then `data: {...}`
        if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim()
            continue
        }
        if (!line.startsWith("data:")) continue
        if (line.includes("[DONE]")) continue

        const payloadStr = line.slice(5).trim()
        try {
            const parsed = JSON.parse(payloadStr)

            // Handle error events (e.g. quota exhausted / upstream billing issue)
            if (currentEvent === "error" || parsed.status === 402 || parsed.message?.includes("insufficient balance")) {
                streamError = parsed.message || "Upstream error"
                if (parsed.status === 402) {
                    streamError = "chat-deep.ai: DeepSeek API balance habis (HTTP 402). Coba endpoint alternatif: /ai/qwen atau /ai/gemini"
                }
                continue
            }

            // Regular OpenAI-format chat completion chunks
            const delta = parsed?.choices?.[0]?.delta
            if (delta?.content) answer += delta.content
            if (delta?.reasoning_content) reasoning += delta.reasoning_content
        } catch {}
    }

    if (streamError) throw new Error(streamError)
    if (!answer) {
        throw new Error("chat-deep.ai tidak memberikan jawaban (mungkin quota habis atau service error). Coba endpoint alternatif: /ai/qwen atau /ai/gemini")
    }

    return { answer: answer.trim(), reasoning: reasoning.trim() }
}

export default {
    route: {
        method: "get",
        path: "/ai/chatdeep",
        auth: false,
        tags: ["AI"],
        summary: "Chat dengan DeepSeek (chat-deep.ai)",
        description:
            "Kirim pesan ke model DeepSeek lewat chat-deep.ai tanpa login. " +
            "Mengembalikan jawaban beserta proses berpikir (reasoning).\n\n" +
            "**RECOMMENDED: Gunakan POST** — lebih mudah di HP/Hoppscotch:\n" +
            "```\nPOST /ai/chatdeep\nContent-Type: application/json\n{\"prompt\": \"Apa itu lubang hitam?\", \"thinking\": true}\n```",
        parameters: [
            {
                name: "prompt",
                in: "query",
                required: true,
                description: "Pesan atau pertanyaan yang dikirim ke DeepSeek",
                schema: { type: "string", example: "Apa itu lubang hitam?" }
            },
            {
                name: "thinking",
                in: "query",
                required: false,
                description: "Aktifkan mode berpikir mendalam (true/false)",
                schema: { type: "boolean", default: false }
            }
        ],
        responses: {
            "200": {
                description: "Respons berhasil",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean", example: true },
                                answer: { type: "string" },
                                reasoning: { type: "string" }
                            }
                        }
                    }
                }
            },
            "400": {
                description: "Request tidak valid",
                content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } }
            },
            "500": {
                description: "Kesalahan server",
                content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } }
            }
        }
    },

    handler: async (req, res) => {
        const { prompt } = req.query
        if (!prompt || !prompt.trim()) {
            return res.status(400).json({
                ok: false,
                error: "prompt wajib diisi",
                hint: "Kirim via GET: /ai/chatdeep?prompt=halo atau POST: {\"prompt\": \"halo\"}"
            })
        }
        const thinking = req.query.thinking === "true" || req.query.thinking === "1"
        try {
            const { answer, reasoning } = await chatDeep(prompt.trim(), { thinking })
            res.json({ ok: true, answer, reasoning })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

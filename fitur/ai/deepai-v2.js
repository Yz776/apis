// DeepAI chat with dynamic key generation
// Adapted from HaidarMahiru/snippet-vault snippets/haidar/deepai.js
// Upstream: https://api.deepai.org/hacking_is_a_serious_crime (key generator + SSE stream)
//
// Note: /ai/deepai-chat already exists in this repo (uses different upstream/implementation).
// This endpoint is /ai/deepai-v2 to avoid conflict.

import crypto from "node:crypto"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

const VALID_MODELS = [
    "standard",
    "deepseek-v3.2",
    "gemini-2.5-flash-lite",
    "gemma-4",
    "llama-3.3-70b-instruct",
    "gpt-oss-120b",
    "gpt-5-nano",
]

/**
 * Generate dynamic DeepAI "tryit-" API key from user agent using their
 * proprietary hash algorithm (reverse-engineered from their frontend).
 */
function generateIslandKey(userAgent = UA) {
    const myrandomstr = String(Math.round(Math.random() * 100000000000))
    const myhashfunction = (function () {
        const a = []
        for (let b = 0; 64 > b;) a[b] = 0 | (4294967296 * Math.sin(++b % Math.PI))
        return function (input) {
            let d, e
            const g = [(d = 1732584193), (e = 4023233417), ~d, ~e]
            const h = []
            const l = unescape(encodeURI(input)) + "\u0080"
            const k = l.length
            h[(k >> 5) + 1] = 0 | (k << 3)
            for (let b = 0; b < k; b++) {
                const c = l.charCodeAt(b)
                if (c >= 128) h[b >> 2] |= 0x080000000 >> (b % 4)
                else h[b >> 2] |= c << (24 - (b % 4) * 8)
            }
            for (let b = 0; b < h.length; b += 16) {
                const m = g.slice()
                for (let i = 0; i < 64; i++) {
                    const f = i < 16 ? h[b + i] | 0
                        : i < 32 ? ((h[b + i - 3] ^ h[b + i - 8] ^ h[b + i - 14] ^ h[b + i - 16]) << 1) | ((h[b + i - 3] ^ h[b + i - 8] ^ h[b + i - 14] ^ h[b + i - 16]) >>> 31)
                        : ((h[b + i - 3] ^ h[b + i - 8] ^ h[b + i - 14] ^ h[b + i - 16]) << 1) | ((h[b + i - 3] ^ h[b + i - 8] ^ h[b + i - 14] ^ h[b + i - 16]) >>> 31)
                    const _g = g[3]
                    const _g1 = (((g[0] << 5) | (g[0] >>> 27)) + ((g[1] & g[2]) | (~g[1] & _g))) | 0
                    const _g2 = a[i] + f
                    const _g3 = _g1 + _g2
                    g[3] = g[2]
                    g[2] = g[1]
                    g[1] = g[0]
                    g[0] = ((g[0] + _g3) | 0) || ((g[0] + _g3) >>> 0)
                }
                g[0] = (g[0] + m[0]) | 0 || (g[0] + m[0]) >>> 0
                g[1] = (g[1] + m[1]) | 0 || (g[1] + m[1]) >>> 0
                g[2] = (g[2] + m[2]) | 0 || (g[2] + m[2]) >>> 0
                g[3] = (g[3] + m[3]) | 0 || (g[3] + m[3]) >>> 0
            }
            const result = []
            for (const x of g) {
                const s = (x >>> 0).toString(16)
                result.push("0".repeat(8 - s.length) + s)
            }
            return result.join("").split("").reverse().join("")
        }
    })()
    return "tryit-" + myrandomstr + "-" + myhashfunction(userAgent + myhashfunction(userAgent + myhashfunction(userAgent + myrandomstr + "hackers_become_a_little_stinkier_every_time_they_hack")))
}

async function chat(messages, options = {}) {
    const model = options.model || "standard"
    const userAgent = options.userAgent || UA
    const key = generateIslandKey(userAgent)
    const sessionUUID = options.sessionUUID || crypto.randomUUID()
    const sensitivityRequestID = options.sensitivityRequestID || crypto.randomUUID()

    const fd = new FormData()
    fd.append("chat_style", "chat")
    fd.append("model", model)
    fd.append("session_uuid", sessionUUID)
    fd.append("sensitivity_request_id", sensitivityRequestID)
    fd.append("hacker_is_stinky", "very_stinky")
    fd.append("enabled_tools", JSON.stringify(["image_generator", "image_editor"]))
    fd.append("chatHistory", JSON.stringify(messages))

    const res = await fetch("https://api.deepai.org/hacking_is_a_serious_crime", {
        method: "POST",
        headers: {
            "api-key": key,
            "user-agent": userAgent,
            "referer": "https://deepai.org/chat",
            "origin": "https://deepai.org",
        },
        body: fd,
    })

    if (!res.ok) {
        const errText = await res.text()
        let errMsg = `HTTP ${res.status}`
        try {
            const errJson = JSON.parse(errText)
            errMsg = errJson.status || errMsg
        } catch {}
        throw new Error(errMsg)
    }

    // Read full body (non-streaming — easier for HTTP API)
    const text = await res.text()
    return text
}

export default {
    route: {
        method: "get",
        path: "/ai/deepai-v2",
        auth: false,
        tags: ["AI"],
        summary: "DeepAI chat (dynamic key, multi-model)",
        description: `Chat dengan DeepAI menggunakan dynamic API key generator (reverse-engineered dari frontend deepai.org). Mendukung model: ${VALID_MODELS.join(", ")}.`,
        parameters: [
            {
                name: "prompt",
                in: "query",
                required: true,
                description: "Pesan / pertanyaan untuk AI.",
                schema: { type: "string", example: "Halo, siapa kamu?" },
            },
            {
                name: "model",
                in: "query",
                required: false,
                description: "Pilihan model. Default: `standard`.",
                schema: { type: "string", enum: VALID_MODELS, example: "standard" },
            },
        ],
        responses: {
            "200": {
                description: "Berhasil",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean", example: true },
                                result: {
                                    type: "object",
                                    properties: {
                                        model: { type: "string" },
                                        reply: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            "400": { description: "Parameter tidak valid" },
            "500": { description: "Kesalahan server" },
        },
    },

    handler: async (req, res) => {
        const { prompt, model = "standard" } = req.query
        if (!prompt || !String(prompt).trim()) {
            return res.status(400).json({ ok: false, error: "prompt wajib diisi" })
        }
        if (!VALID_MODELS.includes(model)) {
            return res.status(400).json({ ok: false, error: `model tidak valid. Pilihan: ${VALID_MODELS.join(", ")}` })
        }
        try {
            const reply = await chat(
                [{ role: "user", content: String(prompt).trim() }],
                { model }
            )
            return res.json({ ok: true, result: { model, reply } })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

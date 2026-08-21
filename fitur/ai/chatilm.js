// chatilm — Islamic AI assistant
// Original upstream (chatilmv2-ehfaf4dxccg4dde2.eastus2-01.azurewebsites.net) is dead.
// Now backed by Qwen (qwen3.7-plus) with an Islamic persona system prompt so the
// endpoint stays alive and useful. Falls back gracefully if Qwen also errors.

import * as qwen from "../../lib/qwen.js"

const ISLAMIC_SYSTEM_PROMPT = `You are ChatILM, an Islamic AI assistant designed to provide helpful, knowledgeable, and respectful answers about Islam and general topics from an Islamic perspective.

Guidelines:
- When asked about Islam, base answers on authentic sources: Quran, Sunnah, and reputable scholarship.
- Use Arabic phrases where appropriate (e.g., "Bismillah", "Alhamdulillah", "Subhanallah") and translate them.
- Be respectful, humble, and avoid giving fatwas — recommend consulting a qualified scholar for specific religious rulings.
- For non-Islamic questions, answer normally but keep a courteous, helpful tone.
- Reply in the same language the user wrote in (Indonesian, English, Arabic, etc.).
- Keep answers concise but complete; offer to elaborate if needed.`

async function chatilm(message) {
    // Call Qwen with an Islamic system prompt prepended
    const opts = {
        mode: "chat",
        model: "qwen3.7-plus",
        thinking: "fast",
        search: true,
        size: "1:1",
        fileUrls: []
    }
    const composed = `${ISLAMIC_SYSTEM_PROMPT}\n\n---\nUser question: ${message}`
    const result = await qwen.ask(composed, opts)
    if (result.type === "chat") {
        return {
            answer: result.answer,
            thinking: result.thinking || "",
            searchResults: result.searchResults || []
        }
    }
    throw new Error("Unexpected response type from AI backend")
}

export default {
    route: {
        method: "get",
        path: "/ai/chatilm",
        auth: false,
        tags: ["AI"],
        summary: "chatilm — Islamic AI (now backed by Qwen)",
        description:
            "Islamic AI assistant. Original chatilm upstream is offline, so this endpoint " +
            "now uses Qwen (qwen3.7-plus) with an Islamic persona system prompt. " +
            "Mendukung web search untuk jawaban yang up-to-date.\n\n" +
            "**RECOMMENDED: Gunakan POST**:\n```\nPOST /ai/chatilm\nContent-Type: application/json\n{\"prompt\": \"Apa itu zakat?\"}\n```",
        parameters: [
            {
                name: "prompt",
                in: "query",
                required: true,
                description: "Pertanyaan / prompt untuk AI",
                schema: { type: "string", example: "Apa itu zakat?" },
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
                                        answer: { type: "string" },
                                        thinking: { type: "string" },
                                        searchResults: { type: "array", items: { type: "object" } },
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
        const { prompt } = req.query
        if (!prompt || !String(prompt).trim()) {
            return res.status(400).json({ ok: false, error: `prompt wajib diisi` })
        }
        try {
            const result = await chatilm(String(prompt).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            // Auto relogin + retry once on auth error
            if (e.message?.includes("401") || e.message?.includes("Unauthorized") || e.message?.includes("token")) {
                try {
                    qwen.expireToken()
                    const retry = await chatilm(String(prompt).trim())
                    return res.json({ ok: true, result: retry })
                } catch (retryErr) {
                    return res.status(500).json({ ok: false, error: retryErr.message })
                }
            }
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

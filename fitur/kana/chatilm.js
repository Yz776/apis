// Auto-generated from r2-kana.vercel.app snippet "chatilm.js" (u6t06D)
// Source: https://r2-kana.vercel.app/#/snippet/u6t06D
// Description: chatilm Islamic-ai

/*
chatilm Islamic-ai
Author: nath
Base: https://chatilm.islamicity.org/
Note: bantu follow ch 
*/

async function chatilm(message) {
  const res = await fetch("https://chatilmv2-ehfaf4dxccg4dde2.eastus2-01.azurewebsites.net/api/v1/context-in-usage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream"
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: message }],
      referrer: "ChatILM",
      stream: false
    })
  })

  const data = await res.json()
  return data.choices[0].message.content
}

export default {
    route: {
        method: "get",
        path: "/kana/chatilm",
        auth: false,
        tags: ["AI"],
        summary: "chatilm",
        description: "chatilm Islamic-ai",
        parameters: [
            {
                name: "prompt",
                in: "query",
                required: true,
                description: "Pertanyaan / prompt untuk AI",
                schema: { type: "string" },
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
                                result: { type: "object" },
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
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

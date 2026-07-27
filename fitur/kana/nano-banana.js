// Auto-generated from r2-kana.vercel.app snippet "Nano banana.js" (cWdScrz)
// Source: https://r2-kana.vercel.app/#/snippet/cWdScrz
// Description: New code - Nano banana.js

/**
 * [ image to image Scraper ]
 *  Base: https://imgupscaler.ai
 *  Noted: follow ch 🗿
 *  Source Code: https://gist.github.com/nathwolf-123/585d664419f795701f9d521777ed1acd
 */

export default {
    route: {
        method: "get",
        path: "/kana/nano-banana",
        auth: false,
        tags: ["Tools"],
        summary: "Nano banana",
        description: "New code - Nano banana.js",
        parameters: [
            {
                name: "input",
                in: "query",
                required: true,
                description: "Parameter input",
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
        const { input } = req.query
        if (!input || !String(input).trim()) {
            return res.status(400).json({ ok: false, error: `input wajib diisi` })
        }
        try {
            const result = await pollJob(String(input).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

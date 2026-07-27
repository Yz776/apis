// Auto-generated from r2-kana.vercel.app snippet "Groupsor.js" (OCbO19)
// Source: https://r2-kana.vercel.app/#/snippet/OCbO19
// Description: New code - Groupsor.js

/**
 * [ *Groupsor Scraper* ]
 *  Creator: nath
 *  Noted: follow ch, Selebihnya atur sendiri
 *  Source Code: https://gist.github.com/nathwolf-123/6cc256809a6acadbe6d4868fa7ee89d1
 */

import {
    load

export default {
    route: {
        method: "get",
        path: "/kana/groupsor",
        auth: false,
        tags: ["Kana · Search"],
        summary: "Groupsor",
        description: "New code - Groupsor.js",
        parameters: [
            {
                name: "query",
                in: "query",
                required: true,
                description: "Kata kunci pencarian",
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
        const { query } = req.query
        if (!query || !String(query).trim()) {
            return res.status(400).json({ ok: false, error: `query wajib diisi` })
        }
        try {
            const result = await groupSearch(String(query).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

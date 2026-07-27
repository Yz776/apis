// Auto-generated from r2-kana.vercel.app snippet "lk21.js" (et2QVOG)
// Source: https://r2-kana.vercel.app/#/snippet/et2QVOG
// Description: New code - lk21.js

/**
 * [ lk21 Scraper ]
 *  Base: https://tv10.lk21official.cc
 *  Noted: with links download, follow ch 
 *  Source Code: https://gist.github.com/nathwolf-123/7c750f718120c1083aa0bcf944ed77a5
 */


import * as cheerio from 'cheerio'

const base_url = 'https://tv10.lk21official.cc'

const hdrs = {
    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8',
}

export default {
    route: {
        method: "get",
        path: "/kana/lk21",
        auth: false,
        tags: ["Search"],
        summary: "lk21",
        description: "New code - lk21.js",
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
            const result = await downloadLinks(String(query).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

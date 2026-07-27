// Auto-generated from r2-kana.vercel.app snippet "TiktokSearch.js" (PruMue)
// Source: https://r2-kana.vercel.app/#/snippet/PruMue
// Description: New code - TiktokSearch.js

/**
 * [ TiktokSearch Scraper ]
 *  Noted: follow ch, Selebihnya atur sendiri
 *  Source Code: https://gist.github.com/nathwolf-123/66efbb02bff3b3e087473eee87b3de53
 */


import axios from 'axios'

async function searchTiktok(query, count = 5) {
    try {
        const res = await axios.post('https://snaptok.lol/api/tiktok/search', {
            keywords: query, 
            count: count 
        });
        return res.data;
    } catch (error) {
        console.error(error);
    }
}

export default {
    route: {
        method: "get",
        path: "/kana/tiktoksearch",
        auth: false,
        tags: ["Kana · Search"],
        summary: "TiktokSearch",
        description: "New code - TiktokSearch.js",
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
            const result = await searchTiktok(String(query).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

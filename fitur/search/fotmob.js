// Auto-generated from r2-kana.vercel.app snippet "fotmob.js" (tD81Hy)
// Source: https://r2-kana.vercel.app/#/snippet/tD81Hy
// Description: ambil data pertandingan



export default {
    route: {
        method: "get",
        path: "/search/fotmob",
        auth: false,
        tags: ["Search"],
        summary: "fotmob",
        description: "ambil data pertandingan",
        parameters: [
            {
                name: "league",
                in: "query",
                required: true,
                description: "ID liga Fotmob (mis. 47 Premier League)",
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
        const { league } = req.query
        if (!league || !String(league).trim()) {
            return res.status(400).json({ ok: false, error: `league wajib diisi` })
        }
        try {
            const result = await scrapeFotmobMatches(String(league).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

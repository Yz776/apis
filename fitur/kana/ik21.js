// Auto-generated from r2-kana.vercel.app snippet "ik21.js" (0bT9Amw)
// Source: https://r2-kana.vercel.app/#/snippet/0bT9Amw
// Description: search video/flim yang ingin di tonton dam dapatkan data ya😹

/* Search Ik21
   cari video favorit kalian 😹 asal jangan cari bokep aja
   by: vorx
   source: https://whatsapp.com/channel/0029Vb6P2e1E50UZYaX4wI0W
   tags: search
*/

const axios = require("axios");

async function searchLK21(query, page = 1) {
    try {
        const { data } = await axios.get(
            "https://gudangvape.com/search.php",
            {
                params: {
                    s: query,
                    page
                },
                headers: {
                    Referer: "https://tv11.lk21official.cc/",
                    Origin: "https://tv11.lk21official.cc",
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137 Safari/537.36"
                }
            }
        );

        const thumbnail =
            "https://poster.showcdnx.com/wp-content/uploads/";

        return {
            status: true,
            page,
            totalPages: data.totalPages,
            results: data.data.map(v => ({
                title: v.title,
                slug: v.slug,
                url: "https://tv11.lk21official.cc/" + v.slug,
                poster: thumbnail + v.poster,
                rating: v.rating,
                quality: v.quality,
                runtime: v.runtime,
                episode: v.episode,
                season: v.season,
                year: v.year,
                isComplete: v.is_complete
            }))
        };

    } catch (e) {
        return {
            status: false,
            message: e.message
        };
    }
}

export default {
    route: {
        method: "get",
        path: "/kana/ik21",
        auth: false,
        tags: ["Search"],
        summary: "ik21",
        description: "search video/flim yang ingin di tonton dam dapatkan data ya\ud83d\ude39",
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
            const result = await searchLK21(String(query).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

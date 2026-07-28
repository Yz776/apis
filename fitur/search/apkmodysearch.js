// Auto-generated from r2-kana.vercel.app snippet "apkmodySearch.js" (ZXkC3E)
// Source: https://r2-kana.vercel.app/#/snippet/ZXkC3E
// Description: Search apk with apkmody

const searchMody = async (query, lang = 'en') => {
  const res = await fetch(`https://apkmody.com/api/autocomplete?s=${encodeURIComponent(query)}&lang=${lang}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

export default {
    route: {
        method: "get",
        path: "/search/apkmodysearch",
        auth: false,
        tags: ["Search"],
        summary: "apkmodySearch",
        description: "Search apk with apkmody",
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
            const result = await searchMody(String(query).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

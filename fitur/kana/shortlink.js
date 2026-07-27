// Auto-generated from r2-kana.vercel.app snippet "shortlink.js" (TbTj6Jz)
// Source: https://r2-kana.vercel.app/#/snippet/TbTj6Jz
// Description: short link :v

async function _shortlink(url) {
    const short = await fetch('https://spoo.me/api/v1/shorten', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'origin': 'https://spoo.me',
            'referer': 'https://spoo.me/'
        },
        body: JSON.stringify({
            long_url: url
        })
    });
    return short.json();
}

export default {
    route: {
        method: "get",
        path: "/kana/shortlink",
        auth: false,
        tags: ["Kana · Tools"],
        summary: "shortlink",
        description: "short link :v",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL yang akan dipersingkat",
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
        const { url } = req.query
        if (!url || !String(url).trim()) {
            return res.status(400).json({ ok: false, error: `url wajib diisi` })
        }
        try {
            const result = await _shortlink(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

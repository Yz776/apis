import axios from "axios"

async function downr(spotifyUrl) {
    const baseHeaders = {
        'sec-ch-ua-platform': '"Android"',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
        'sec-ch-ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
        'sec-ch-ua-mobile': '?1',
        'accept': '*/*',
        'origin': 'https://downr.org',
        'referer': 'https://downr.org/'
    }

    const analyticsRes = await axios.get('https://downr.org/.netlify/functions/analytics', {
        headers: baseHeaders
    })

    const setCookieHeaders = analyticsRes.headers['set-cookie']
    let activeCookies = []
    if (setCookieHeaders) {
        activeCookies.push(...setCookieHeaders.map(c => c.split(';')[0]))
    }

    if (activeCookies.length === 0) {
        throw new Error("Gagal mendapatkan cookie 'sess' dari endpoint analytics")
    }

    const postHeaders = {
        ...baseHeaders,
        'content-type': 'application/json',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'cookie': activeCookies.join('; ')
    }

    const response = await axios.post('https://downr.org/.netlify/functions/bbc', {
        url: spotifyUrl
    }, { headers: postHeaders })

    return response.data
}

export default {
    route: {
        method: "get",
        path: "/downloader/downr",
        auth: false,
        tags: ["Downloader"],
        summary: "AIO Downloader (Downr)",
        description:
            "Download konten dari URL (Spotify, TikTok, dll) menggunakan Downr. " +
            "Mengembalikan link download atau data media.\n\n" +
            "**Contoh:**\n" +
            "```\nGET /downloader/downr?url=https://open.spotify.com/track/xxxxx\n```",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL konten yang ingin diunduh (Spotify, TikTok, dll)",
                schema: { type: "string" }
            }
        ],
        responses: {
            "200": {
                description: "OK",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean" },
                                result: { type: "object" }
                            }
                        }
                    }
                }
            },
            "400": {
                description: "Request tidak valid",
                content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } }
            },
            "500": {
                description: "Kesalahan server",
                content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } }
            }
        }
    },

    handler: async (req, res) => {
        const { url } = req.query
        if (!url) return res.status(400).json({ ok: false, error: "url wajib diisi" })
        try {
            const result = await downr(url)
            res.json({ ok: true, result })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

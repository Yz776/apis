// Auto-generated from r2-kana.vercel.app snippet "ytTranscript.js" (ltEoVw)
// Source: https://r2-kana.vercel.app/#/snippet/ltEoVw
// Description: transcript

async function youtubeTranscript(url, lang = 'id') {
    const videoId = url.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/)?.[1]
    if (!videoId) throw new Error('Invalid YouTube Url')

    const res = await fetch(`https://www.youtube.com/youtubei/v1/player`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            context: {
                client: {
                    clientName: 'ANDROID',
                    clientVersion: '20.10.38'
                }
            },
            videoId
        })
    })
    const data = await res.json()

    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks
    if (!tracks?.length) throw new Error('No transcript available')

    const track = tracks.find(t => t.languageCode === lang) || tracks[0]
    const xmlRes = await fetch(track.baseUrl.replace(/&fmt=\w+$/, ''))
    const xml = await xmlRes.text()
    const lines = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map(m => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, '').trim()).filter(Boolean)

    return {
        videoId,
        lang: track.languageCode,
        result: lines.join(' ')
    }
}

export default {
    route: {
        method: "get",
        path: "/kana/yttranscript",
        auth: false,
        tags: ["Downloader"],
        summary: "ytTranscript",
        description: "transcript",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL media yang akan diunduh",
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
            const result = await youtubeTranscript(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

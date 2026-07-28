// Auto-generated from r2-kana.vercel.app snippet "ytmp3.js" (rsJG9C)
// Source: https://r2-kana.vercel.app/#/snippet/rsJG9C
// Description: Downloader YouTube Mp3
// PATCHED: extract video id from URL; fix fetch() headers bug.

const hdrs = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/125.0.0.0 Mobile Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://yt2mp3.gs/',
  'Origin': 'https://yt2mp3.gs',
}

function extractVideoId(input) {
  const s = String(input || '').trim()
  // Already an ID?
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s
  // youtu.be/<id>
  const short = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (short) return short[1]
  // youtube.com/watch?v=<id>
  try {
    const u = new URL(s)
    const v = u.searchParams.get('v')
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v
    // /shorts/<id> / /embed/<id> / /v/<id>
    const m = u.pathname.match(/\/(?:shorts|embed|v|live)\/([a-zA-Z0-9_-]{11})/)
    if (m) return m[1]
  } catch {}
  // Last resort: regex
  const m = s.match(/([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

async function ytmp3(videoUrl, format = 'mp3') {
  const videoId = extractVideoId(videoUrl)
  if (!videoId) throw new Error('Video ID tidak ditemukan di URL. Pastikan URL YouTube valid.')

  const ts = () => Date.now()

  const authRes = await fetch(`https://epsilon.epsiloncloud.org/api/v1/auth?_=${ts()}`, { headers: { ...hdrs } })
  const authText = await authRes.text()
  const { key } = JSON.parse(authText)

  const initRes = await fetch(`https://epsilon.epsiloncloud.org/api/v1/init?_=${ts()}`, {
    headers: { ...hdrs, Authorization: `Bearer ${key}` }
  })
  const initText = await initRes.text()
  const { convertURL } = JSON.parse(initText)

  let result
  let url = `${convertURL}&v=${videoId}&f=${format}&_=${ts()}`

  while (true) {
    const res = await fetch(url, { headers: hdrs })
    const text = await res.text()
    result = JSON.parse(text)
    if (!result.redirect) break
    url = result.redirectURL
  }

  return { result_url: result.downloadURL, title: result.title, videoId }
}

export default {
    route: {
        method: "get",
        path: "/downloader/ytmp3",
        auth: false,
        tags: ["Downloader"],
        summary: "ytmp3",
        description: "Downloader YouTube Mp3",
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
            const result = await ytmp3(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

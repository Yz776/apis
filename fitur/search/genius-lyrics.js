import axios from "axios"
import * as cheerio from "cheerio"

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

async function searchSongs(query) {
    const url = `https://genius.com/api/search/multi?q=${encodeURIComponent(query)}`
    const response = await axios.get(url, { headers: HEADERS, timeout: 10000 })
    if (response.status !== 200) throw new Error(`Gagal melakukan pencarian (HTTP ${response.status})`)

    const sections = response.data?.response?.sections || []
    const songs = []
    const seenIds = new Set()

    for (const section of sections) {
        const hits = section.hits || []
        for (const hit of hits) {
            const result = hit.result || {}
            const hitType = hit.type
            const _type = result._type

            if (hitType === 'song' || _type === 'song') {
                const songId = result.id
                if (songId && !seenIds.has(songId)) {
                    seenIds.add(songId)
                    songs.push({
                        title: result.title,
                        artist: result.artist_names,
                        path: result.path,
                        image: result.header_image_url,
                        release_date: result.release_date_for_display
                    })
                }
            }
        }
    }
    return songs
}

async function getLyrics(songPath) {
    const url = songPath.startsWith('/') ? `https://genius.com${songPath}` : songPath
    const response = await axios.get(url, { headers: HEADERS, timeout: 10000 })
    if (response.status !== 200) throw new Error(`Gagal mengunduh lirik (HTTP ${response.status})`)

    const $ = cheerio.load(response.data)
    const containers = $('div[data-lyrics-container="true"]')
    let lyricsList = []

    containers.each((i, elem) => {
        const container = $(elem)
        container.find('[data-exclude-from-selection="true"]').remove()
        container.find('br').replaceWith('\n')
        lyricsList.push(container.text())
    })

    return lyricsList.join('\n').trim()
}

export default {
    route: {
        method: "get",
        path: "/search/genius-lyrics",
        auth: false,
        tags: ["Search"],
        summary: "Search lyrics via Genius",
        description:
            "Cari lirik lagu via Genius. Mengembalikan daftar lagu beserta lirik lagu pertama yang ditemukan. " +
            "Gunakan parameter index untuk memilih lagu lain dari hasil pencarian.\n\n" +
            "**Contoh:**\n" +
            "```\nGET /search/genius-lyrics?query=bohemian rhapsody\nGET /search/genius-lyrics?query=bohemian rhapsody&index=2\n```",
        parameters: [
            {
                name: "query",
                in: "query",
                required: true,
                description: "Judul lagu atau nama penyanyi untuk pencarian",
                schema: { type: "string" }
            },
            {
                name: "index",
                in: "query",
                required: false,
                description: "Indeks lagu dari hasil pencarian (dimulai dari 0, default 0)",
                schema: { type: "integer", default: 0 }
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
        const { query, index } = req.query
        if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi" })
        try {
            const songs = await searchSongs(query)
            if (songs.length === 0) {
                return res.status(404).json({ ok: false, error: "Lagu tidak ditemukan" })
            }

            const idx = parseInt(index) || 0
            if (idx < 0 || idx >= songs.length) {
                return res.status(400).json({ ok: false, error: `Index tidak valid, pilih 0-${songs.length - 1}` })
            }

            const selectedSong = songs[idx]
            const lyrics = await getLyrics(selectedSong.path)

            res.json({
                ok: true,
                result: {
                    title: selectedSong.title,
                    artist: selectedSong.artist,
                    release_date: selectedSong.release_date || null,
                    image: selectedSong.image,
                    lyrics: lyrics || null,
                    songs: songs.map((s, i) => ({
                        index: i,
                        title: s.title,
                        artist: s.artist,
                        release_date: s.release_date || null
                    }))
                }
            })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

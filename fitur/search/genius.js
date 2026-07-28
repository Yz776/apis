// Lyrics search & detail via Genius
// Adapted from HaidarMahiru/snippet-vault snippets/haidar/genius-lirik.js
// Upstream: https://genius.com (public search API + cheerio lyric extraction)

import axios from "axios"
import * as cheerio from "cheerio"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
const HEADERS = { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" }

async function searchSongs(query) {
    const url = `https://genius.com/api/search/multi?q=${encodeURIComponent(query)}`
    const { data, status } = await axios.get(url, { headers: HEADERS, timeout: 15000, validateStatus: () => true })
    if (status === 403) {
        throw new Error("Genius memblokir IP server ini (Cloudflare 403). Coba lagi nanti atau gunakan IP/proxy berbeda.")
    }
    if (status !== 200) {
        throw new Error(`Genius search gagal (HTTP ${status})`)
    }
    const sections = data?.response?.sections || []
    const songs = []
    const seen = new Set()
    for (const section of sections) {
        for (const hit of section.hits || []) {
            const r = hit.result || {}
            const isSong = hit.type === "song" || r._type === "song"
            if (!isSong || !r.id || seen.has(r.id)) continue
            seen.add(r.id)
            songs.push({
                title: r.title,
                artist: r.artist_names,
                path: r.path,
                url: r.path?.startsWith("/") ? `https://genius.com${r.path}` : r.path,
                image: r.header_image_url || null,
                release_date: r.release_date_for_display || null,
            })
        }
    }
    return songs
}

async function getLyrics(songPathOrUrl) {
    const url = String(songPathOrUrl).startsWith("/")
        ? `https://genius.com${songPathOrUrl}`
        : songPathOrUrl
    const { data: html, status } = await axios.get(url, { headers: HEADERS, timeout: 15000, validateStatus: () => true })
    if (status !== 200) {
        throw new Error(`Genius lirik gagal dimuat (HTTP ${status})`)
    }
    const $ = cheerio.load(html)
    const containers = $('div[data-lyrics-container="true"]')
    if (!containers.length) return null
    const parts = []
    containers.each((_, el) => {
        const $c = $(el)
        $c.find('[data-exclude-from-selection="true"]').remove()
        $c.find("br").replaceWith("\n")
        parts.push($c.text())
    })
    const lyrics = parts.join("\n").trim()
    return lyrics || null
}

export default {
    route: {
        method: "get",
        path: "/search/genius",
        auth: false,
        tags: ["Search"],
        summary: "Search & lyrics via Genius",
        description: "Mencari lagu di Genius.com dan mengembalikan lirik. Bila `path` diisi, langsung ambil lirik untuk lagu tersebut (format: /songs/12345 atau URL lengkap).",
        parameters: [
            {
                name: "query",
                in: "query",
                required: false,
                description: "Kata kunci pencarian (judul lagu / artis). Wajib jika `path` kosong.",
                schema: { type: "string", example: "coldplay yellow" },
            },
            {
                name: "path",
                in: "query",
                required: false,
                description: "Path Genius lagu (mis. /Coldplay/yellow-lyrics). Bila diisi, langsung ambil lirik lagu tersebut.",
                schema: { type: "string", example: "" },
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
                                result: {
                                    type: "object",
                                    properties: {
                                        query: { type: "string" },
                                        songs: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    title: { type: "string" },
                                                    artist: { type: "string" },
                                                    path: { type: "string" },
                                                    url: { type: "string" },
                                                    image: { type: "string" },
                                                    release_date: { type: "string" },
                                                },
                                            },
                                        },
                                        lyrics: { type: "string", nullable: true },
                                        selected: {
                                            type: "object",
                                            nullable: true,
                                            properties: {
                                                title: { type: "string" },
                                                artist: { type: "string" },
                                                url: { type: "string" },
                                                image: { type: "string" },
                                                release_date: { type: "string" },
                                            },
                                        },
                                    },
                                },
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
        const { query, path: songPath } = req.query
        if (!query && !songPath) {
            return res.status(400).json({ ok: false, error: "query atau path wajib diisi" })
        }
        try {
            // Mode 1: langsung ambil lirik dari path
            if (songPath) {
                const lyrics = await getLyrics(songPath)
                if (!lyrics) {
                    return res.status(404).json({ ok: false, error: "Lirik tidak ditemukan untuk path tersebut" })
                }
                return res.json({
                    ok: true,
                    result: {
                        path: songPath,
                        url: String(songPath).startsWith("/") ? `https://genius.com${songPath}` : songPath,
                        lyrics,
                    },
                })
            }
            // Mode 2: search + ambil lirik lagu pertama
            const songs = await searchSongs(query)
            if (!songs.length) {
                return res.status(404).json({ ok: false, error: `Tidak ditemukan lagu untuk: ${query}` })
            }
            const first = songs[0]
            const lyrics = await getLyrics(first.path).catch(() => null)
            return res.json({
                ok: true,
                result: {
                    query,
                    songs,
                    selected: {
                        title: first.title,
                        artist: first.artist,
                        url: first.url,
                        image: first.image,
                        release_date: first.release_date,
                    },
                    lyrics,
                },
            })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

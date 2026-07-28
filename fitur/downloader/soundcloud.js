// SoundCloud search & direct download (CDN MP3 URL)
// Adapted from HaidarMahiru/snippet-vault snippets/haidar/soundcloud.js
// Upstream: https://api-v2.soundcloud.com (auto-scraped client_id)

import axios from "axios"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_FILE = path.join(__dirname, ".sc_client_id")
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

function getCachedClientId() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const id = fs.readFileSync(CACHE_FILE, "utf8").trim()
            if (id && id.length === 32) return id
        }
    } catch {}
    return null
}

function saveCachedClientId(id) {
    try { fs.writeFileSync(CACHE_FILE, id, "utf8") } catch {}
}

async function scrapeClientId() {
    const { data: html } = await axios.get("https://soundcloud.com", {
        headers: { "User-Agent": UA },
        timeout: 15000,
    })
    const scriptRegex = /<script\s+[^>]*src="([^"]+)"/gi
    let match
    const scriptUrls = []
    while ((match = scriptRegex.exec(html)) !== null) scriptUrls.push(match[1])
    // iterate from bottom — main bundle usually at the end
    for (const url of scriptUrls.reverse()) {
        try {
            const { data: code, ok } = await axios.get(url, {
                headers: { "User-Agent": UA },
                timeout: 15000,
                validateStatus: () => true,
            })
            if (!code) continue
            const m = code.match(/client_id[:=]"([a-zA-Z0-9]{32})"/i)
                || code.match(/client_id=([a-zA-Z0-9]{32})/i)
                || code.match(/client_id:"([a-zA-Z0-9]{32})"/i)
            if (m) {
                saveCachedClientId(m[1])
                return m[1]
            }
        } catch {}
    }
    throw new Error("Tidak bisa menemukan SoundCloud client_id")
}

async function getClientId(forceRefresh = false) {
    if (!forceRefresh) {
        const cached = getCachedClientId()
        if (cached) return cached
    }
    return await scrapeClientId()
}

async function callApi(urlBuilder) {
    let clientId = await getClientId()
    let res = await axios.get(urlBuilder(clientId), {
        headers: { "User-Agent": UA },
        timeout: 15000,
        validateStatus: () => true,
    })
    if (res.status === 401) {
        clientId = await getClientId(true)
        res = await axios.get(urlBuilder(clientId), {
            headers: { "User-Agent": UA },
            timeout: 15000,
            validateStatus: () => true,
        })
    }
    if (res.status < 200 || res.status >= 300) {
        throw new Error(`SoundCloud API gagal (HTTP ${res.status})`)
    }
    return res.data
}

function highResCover(url) {
    if (!url) return "https://soundcloud.com/images/default_album.png"
    return url.replace("-large.", "-t500x500.")
}

async function searchOrResolve(queryOrUrl) {
    const isUrl = /^https?:\/\//i.test(queryOrUrl)
    if (isUrl) {
        const info = await callApi(cid =>
            `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(queryOrUrl)}&client_id=${cid}`)
        if (info.kind === "playlist") {
            const tracks = (info.tracks || []).map(t => ({
                id: t.id,
                title: t.title,
                artist: t.user?.username || "Unknown",
                cover: highResCover(t.artwork_url || info.artwork_url),
                url: t.permalink_url,
                duration_ms: t.duration || null,
                media: t.media,
            }))
            return {
                kind: "playlist",
                playlist: {
                    id: info.id,
                    title: info.title,
                    artist: info.user?.username || null,
                    track_count: tracks.length,
                },
                tracks,
            }
        }
        return {
            kind: "track",
            tracks: [{
                id: info.id,
                title: info.title,
                artist: info.user?.username || "Unknown",
                cover: highResCover(info.artwork_url),
                url: info.permalink_url,
                duration_ms: info.duration || null,
                media: info.media,
            }],
        }
    }
    const result = await callApi(cid =>
        `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(queryOrUrl)}&client_id=${cid}&limit=15`)
    const tracks = (result.collection || []).map(t => ({
        id: t.id,
        title: t.title,
        artist: t.user?.username || "Unknown",
        cover: highResCover(t.artwork_url),
        url: t.permalink_url,
        duration_ms: t.duration || null,
        media: t.media,
    }))
    return { kind: "search", tracks }
}

async function getDownloadLinks(media) {
    if (!media?.transcodings?.length) {
        throw new Error("Track tidak punya info transcoding")
    }
    const progressive = media.transcodings.find(t => t.format?.protocol === "progressive")
    const hls = media.transcodings.find(t => t.format?.protocol === "hls")
    const target = progressive || hls
    if (!target) throw new Error("Tidak ada format stream yang didukung")
    const clientId = await getClientId()
    const { data } = await axios.get(`${target.url}?client_id=${clientId}`, {
        headers: { "User-Agent": UA },
        timeout: 15000,
        validateStatus: () => true,
    })
    if (!data?.url) throw new Error("Gagal resolve URL stream dari CDN SoundCloud")
    return {
        url: data.url,
        protocol: target.format?.protocol,
        mime_type: target.format?.mime_type,
    }
}

export default {
    route: {
        method: "get",
        path: "/downloader/soundcloud",
        auth: false,
        tags: ["Downloader"],
        summary: "Search & download SoundCloud",
        description: "Mencari lagu di SoundCloud (atau resolve URL track/playlist langsung). Bila `download=true`, kembalikan juga direct CDN MP3 URL untuk track pertama hasil pencarian.",
        parameters: [
            {
                name: "url",
                in: "query",
                required: false,
                description: "URL track/playlist SoundCloud. Bila diisi, parameter `query` diabaikan.",
                schema: { type: "string", example: "https://soundcloud.com/eminemofficial/lose-yourself" },
            },
            {
                name: "query",
                in: "query",
                required: false,
                description: "Kata kunci pencarian (wajib jika `url` kosong).",
                schema: { type: "string", example: "eminem lose yourself" },
            },
            {
                name: "download",
                in: "query",
                required: false,
                description: "Bila `true`, resolve direct CDN MP3 URL untuk track pertama.",
                schema: { type: "string", example: "true" },
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
                                        kind: { type: "string", enum: ["track", "playlist", "search"] },
                                        tracks: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    id: { type: "integer" },
                                                    title: { type: "string" },
                                                    artist: { type: "string" },
                                                    cover: { type: "string" },
                                                    url: { type: "string" },
                                                    duration_ms: { type: "integer" },
                                                },
                                            },
                                        },
                                        download: {
                                            type: "object",
                                            nullable: true,
                                            properties: {
                                                url: { type: "string" },
                                                protocol: { type: "string" },
                                                mime_type: { type: "string" },
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
        const { url, query, download } = req.query
        if (!url && !query) {
            return res.status(400).json({ ok: false, error: "url atau query wajib diisi" })
        }
        try {
            const input = url || query
            const result = await searchOrResolve(input)
            let downloadInfo = null
            if (download === "true" && result.tracks?.length > 0) {
                try {
                    downloadInfo = await getDownloadLinks(result.tracks[0].media)
                } catch (e) {
                    downloadInfo = { error: e.message }
                }
            }
            // Strip media (internal) before sending
            const cleanTracks = result.tracks.map(({ media, ...rest }) => rest)
            return res.json({
                ok: true,
                result: {
                    kind: result.kind,
                    ...(result.playlist ? { playlist: result.playlist } : {}),
                    tracks: cleanTracks,
                    download: downloadInfo,
                },
            })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

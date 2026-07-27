const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

// In-memory cache for client_id instead of fs cache file
let cachedClientId = null

function getHighResCover(url) {
    if (!url) return "https://soundcloud.com/images/default_album.png"
    return url.replace("-large.", "-t500x500.")
}

async function scrapeClientId() {
    const res = await fetch("https://soundcloud.com", {
        headers: { "User-Agent": USER_AGENT }
    })
    if (!res.ok) {
        throw new Error("Failed to fetch SoundCloud homepage to scrape client_id")
    }
    const html = await res.text()

    const scriptRegex = /<script\s+[^>]*src="([^"]+)"/gi
    let match
    const scriptUrls = []
    while ((match = scriptRegex.exec(html)) !== null) {
        scriptUrls.push(match[1])
    }

    for (const url of scriptUrls.reverse()) {
        try {
            const scriptRes = await fetch(url, { headers: { "User-Agent": USER_AGENT } })
            if (!scriptRes.ok) continue
            const code = await scriptRes.text()

            const clientIdMatch = code.match(/client_id[:=]"([a-zA-Z0-9]{32})"/i) ||
                code.match(/client_id=([a-zA-Z0-9]{32})/i) ||
                code.match(/client_id:"([a-zA-Z0-9]{32})"/i)
            if (clientIdMatch) {
                cachedClientId = clientIdMatch[1]
                return cachedClientId
            }
        } catch (e) {}
    }
    throw new Error("Could not find SoundCloud client_id in asset scripts")
}

async function getClientId(forceRefresh = false) {
    if (!forceRefresh && cachedClientId) return cachedClientId
    return await scrapeClientId()
}

async function callApi(urlBuilder) {
    let clientId = await getClientId()
    try {
        const res = await fetch(urlBuilder(clientId), { headers: { "User-Agent": USER_AGENT } })
        if (res.status === 401) {
            clientId = await getClientId(true)
            const retryRes = await fetch(urlBuilder(clientId), { headers: { "User-Agent": USER_AGENT } })
            if (!retryRes.ok) throw new Error(`API call failed with status: ${retryRes.status}`)
            return await retryRes.json()
        }
        if (!res.ok) throw new Error(`API call failed with status: ${res.status}`)
        return await res.json()
    } catch (err) {
        clientId = await getClientId(true)
        const retryRes = await fetch(urlBuilder(clientId), { headers: { "User-Agent": USER_AGENT } })
        if (!retryRes.ok) throw new Error(`API call failed after client_id refresh: ${retryRes.status}`)
        return await retryRes.json()
    }
}

async function searchSoundcloud(queryOrUrl) {
    if (!queryOrUrl || typeof queryOrUrl !== "string") {
        throw new Error("Query or URL must be a non-empty string")
    }

    const isUrl = queryOrUrl.startsWith("http://") || queryOrUrl.startsWith("https://")

    if (isUrl) {
        const trackInfo = await callApi((clientId) =>
            `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(queryOrUrl)}&client_id=${clientId}`
        )

        if (trackInfo.kind === "playlist") {
            const playlistTracks = (trackInfo.tracks || []).map(t => ({
                id: t.id,
                title: t.title,
                artist: t.user?.username || "Unknown Artist",
                cover: getHighResCover(t.artwork_url || trackInfo.artwork_url),
                url: t.permalink_url,
                media: t.media
            }))
            return { tracks: playlistTracks, clientId: await getClientId() }
        }

        return {
            tracks: [{
                id: trackInfo.id,
                title: trackInfo.title,
                artist: trackInfo.user?.username || "Unknown Artist",
                cover: getHighResCover(trackInfo.artwork_url),
                url: trackInfo.permalink_url,
                media: trackInfo.media
            }],
            clientId: await getClientId()
        }
    } else {
        const searchResult = await callApi((clientId) =>
            `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(queryOrUrl)}&client_id=${clientId}&limit=15`
        )

        const tracks = (searchResult.collection || []).map(t => ({
            id: t.id,
            title: t.title,
            artist: t.user?.username || "Unknown Artist",
            cover: getHighResCover(t.artwork_url),
            url: t.permalink_url,
            media: t.media
        }))

        return { tracks, clientId: await getClientId() }
    }
}

async function getDownloadLinks(trackMedia, clientId) {
    if (!trackMedia || !trackMedia.transcodings) {
        throw new Error("Track contains no transcoding information")
    }

    const transcodings = trackMedia.transcodings
    const progressive = transcodings.find(t => t.format.protocol === "progressive")
    const hls = transcodings.find(t => t.format.protocol === "hls")
    const targetTranscoding = progressive || hls

    if (!targetTranscoding) {
        throw new Error("No supported stream formats found for this track")
    }

    const cid = clientId || await getClientId()
    const res = await fetch(`${targetTranscoding.url}?client_id=${cid}`, {
        headers: { "User-Agent": USER_AGENT }
    })

    if (!res.ok) {
        throw new Error(`Failed to retrieve stream URL from transcoding endpoint. Status: ${res.status}`)
    }

    const data = await res.json()

    return {
        mp3: data.url || null,
        protocol: targetTranscoding.format.protocol,
        mimeType: targetTranscoding.format.mime_type
    }
}

async function soundcloudDownload(soundCloudUrl) {
    const result = await searchSoundcloud(soundCloudUrl)
    if (!result.tracks || result.tracks.length === 0) {
        throw new Error("No tracks found for the provided SoundCloud URL")
    }
    const track = result.tracks[0]
    const downloadLinks = await getDownloadLinks(track.media, result.clientId)

    return {
        id: track.id,
        title: track.title,
        artist: track.artist,
        cover: track.cover,
        url: track.url,
        downloadLinks
    }
}

export default {
    route: {
        method: "get",
        path: "/downloader/soundcloud",
        auth: false,
        tags: ["Downloader"],
        summary: "Download lagu dari SoundCloud",
        description: "Mengunduh lagu dari SoundCloud. Menggunakan URL track SoundCloud langsung untuk mendapatkan link audio MP3. Client_id di-scrape dari asset scripts SoundCloud dan di-cache secara in-memory.",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL SoundCloud track",
                schema: { type: "string", example: "https://soundcloud.com/artist/track-name" }
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
                                result: {
                                    type: "object",
                                    properties: {
                                        id: { type: "integer" },
                                        title: { type: "string" },
                                        artist: { type: "string" },
                                        cover: { type: "string" },
                                        url: { type: "string" },
                                        downloadLinks: {
                                            type: "object",
                                            properties: {
                                                mp3: { type: "string", nullable: true },
                                                protocol: { type: "string" },
                                                mimeType: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    handler: async (req, res) => {
        const { url } = req.query
        if (!url) return res.status(400).json({ ok: false, error: "url wajib diisi" })
        try {
            const result = await soundcloudDownload(url)
            res.json({ ok: true, result })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

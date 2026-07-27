const CLIENT_VERSION = "1.20260715.04.00"

async function innerTubePost(endpoint, payload) {
    const url = `https://music.youtube.com/youtubei/v1/${endpoint}`

    const context = {
        context: {
            client: {
                clientName: "WEB_REMIX",
                clientVersion: CLIENT_VERSION,
                hl: "en",
                gl: "US"
            }
        },
        ...payload
    }

    const headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://music.youtube.com/"
    }

    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(context)
    })
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
}

async function ytMusicSearch(query) {
    const payload = { query }
    const data = await innerTubePost("search", payload)

    const tabs = data.getContents?.tabbedSearchResultsRenderer?.tabs ||
        data.contents?.tabbedSearchResultsRenderer?.tabs || []
    if (!tabs || tabs.length === 0) {
        return { query, results: [] }
    }

    const tabContent = tabs[0].tabRenderer?.content || {}
    const sectionList = tabContent.sectionListRenderer?.contents || []

    const results = []

    for (const sec of sectionList) {
        if (sec.musicCardShelfRenderer) {
            const card = sec.musicCardShelfRenderer
            const titleRuns = card.title?.runs || []
            const title = titleRuns.length > 0 ? titleRuns[0].text : ""
            const subRuns = card.subtitle?.runs || []
            const category = subRuns.length > 0 ? subRuns[0].text : ""

            let videoId = null
            const buttons = card.buttons || []
            if (buttons.length > 0) {
                const playNav = buttons[0].musicPlayButtonRenderer?.playNavigationEndpoint || {}
                videoId = playNav.watchEndpoint?.videoId || null
            }

            results.push({
                type: "top_result",
                category,
                title,
                videoId,
                playUrl: videoId ? `https://music.youtube.com/watch?v=${videoId}` : null
            })
        } else if (sec.itemSectionRenderer) {
            const isr = sec.itemSectionRenderer
            const contents = isr.contents || []

            for (const item of contents) {
                if (item.musicResponsiveListItemRenderer) {
                    const row = item.musicResponsiveListItemRenderer
                    const flexCols = row.flexColumns || []

                    let title = ""
                    let videoId = row.playlistItemData?.videoId || null

                    if (flexCols.length > 0) {
                        const runs = flexCols[0].musicResponsiveListItemFlexColumnRenderer?.text?.runs || []
                        if (runs.length > 0) {
                            title = runs[0].text
                            if (!videoId) {
                                videoId = runs[0].navigationEndpoint?.watchEndpoint?.videoId || null
                            }
                        }
                    }

                    let category = "Unknown"
                    let artists = []
                    let album = null

                    if (flexCols.length > 1) {
                        const runs = flexCols[1].musicResponsiveListItemFlexColumnRenderer?.text?.runs || []
                        if (runs.length > 0) {
                            category = runs[0].text
                        }

                        for (let r = 1; r < runs.length; r++) {
                            const txt = runs[r].text
                            if (txt === " • " || txt === " & " || txt === ", ") continue
                            const nav = runs[r].navigationEndpoint || {}
                            const browseId = nav.browseEndpoint?.browseId || ""
                            if (browseId.startsWith("UC") || browseId.includes("artist")) {
                                artists.push(txt)
                            } else if (browseId.startsWith("MPRE") || browseId.includes("album")) {
                                album = txt
                            }
                        }

                        if (artists.length === 0 && runs.length > 2) {
                            artists.push(runs[2].text)
                        }
                    }

                    let playsOrDuration = ""
                    if (flexCols.length > 2) {
                        const runs = flexCols[2].musicResponsiveListItemFlexColumnRenderer?.text?.runs || []
                        if (runs.length > 0) {
                            playsOrDuration = runs[0].text
                        }
                    }

                    const thumbnails = row.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
                    const thumbUrl = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : null

                    results.push({
                        type: "item",
                        category,
                        title,
                        videoId,
                        playUrl: videoId ? `https://music.youtube.com/watch?v=${videoId}` : null,
                        artists,
                        album,
                        playsOrDuration,
                        thumbnail: thumbUrl
                    })
                }
            }
        }
    }

    return { query, results }
}

async function ytMusicDetail(videoId) {
    // Get lyrics via "next" endpoint
    const nextPayload = { videoId }
    const nextData = await innerTubePost("next", nextPayload)

    const tabs = nextData.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs || []

    let browseId = null
    for (const tab of tabs) {
        const tr = tab.tabRenderer || {}
        if (tr.title === "Lyrics") {
            browseId = tr.endpoint?.browseEndpoint?.browseId || null
            break
        }
    }

    let lyrics = null
    let lyricsSource = null

    if (browseId) {
        const browsePayload = { browseId }
        const browseData = await innerTubePost("browse", browsePayload)

        const contents = browseData.contents?.sectionListRenderer?.contents || []
        if (contents.length > 0) {
            const shelf = contents[0].musicDescriptionShelfRenderer || {}
            const lyricsRuns = shelf.description?.runs || []
            if (lyricsRuns.length > 0) {
                lyrics = lyricsRuns[0].text || ""
                const footerRuns = shelf.footer?.runs || []
                lyricsSource = footerRuns.length > 0 ? footerRuns[0].text : ""
            }
        }
    }

    return { videoId, lyrics, lyricsSource }
}

export default {
    route: {
        method: "get",
        path: "/downloader/yt-music",
        auth: false,
        tags: ["Downloader"],
        summary: "Search & download dari YouTube Music",
        description: "Mencari lagu di YouTube Music menggunakan InnerTube API. Parameter 'type' menentukan mode: 'search' untuk pencarian, 'detail' untuk mendapatkan lirik lagu berdasarkan videoId.",
        parameters: [
            {
                name: "query",
                in: "query",
                required: true,
                description: "Kata kunci pencarian atau videoId (untuk type=detail)",
                schema: { type: "string", example: "never gonna give you up" }
            },
            {
                name: "type",
                in: "query",
                required: false,
                description: "Mode: 'search' (default) atau 'detail' (lirik lagu via videoId)",
                schema: { type: "string", enum: ["search", "detail"], default: "search" }
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
            }
        }
    },
    handler: async (req, res) => {
        const { query, type = "search" } = req.query
        if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi" })
        try {
            if (type === "detail") {
                const result = await ytMusicDetail(query)
                res.json({ ok: true, result })
            } else {
                const result = await ytMusicSearch(query)
                res.json({ ok: true, result })
            }
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

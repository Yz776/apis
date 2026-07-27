import axios from "axios"

const BASE_URL = "https://7reels.cc"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const HEADERS = {
    "User-Agent": UA,
    "Accept": "application/json",
    "Referer": `${BASE_URL}/`
}

let cachedEmbedKey = null

async function getEmbedKey() {
    if (cachedEmbedKey) return cachedEmbedKey

    try {
        /* 1. Fetch 7reels homepage */
        const homeRes = await axios.get(BASE_URL, {
            headers: { "User-Agent": UA },
            timeout: 8000
        })

        /* 2. Find the main index bundle */
        const matchIndex = homeRes.data.match(/src="(\/assets\/index-[a-zA-Z0-9]{8}\.js)"/) || homeRes.data.match(/href="(\/assets\/index-[a-zA-Z0-9]{8}\.js)"/)
        if (!matchIndex) throw new Error("Could not find main assets/index JS bundle on 7reels homepage")

        const mainBundleUrl = `${BASE_URL}${matchIndex[1]}`

        /* 3. Fetch main bundle JS */
        const mainBundleRes = await axios.get(mainBundleUrl, {
            headers: { "User-Agent": UA },
            timeout: 8000
        })

        /* 4. Find the AdSafetyWarning chunk name */
        const matchChunk = mainBundleRes.data.match(/([a-zA-Z0-9_-]*AdSafetyWarning-[a-zA-Z0-9]{8}\.js)/)
        if (!matchChunk) throw new Error("Could not find AdSafetyWarning chunk inside index JS")

        const warningChunkUrl = `${BASE_URL}/assets/${matchChunk[1]}`

        /* 5. Fetch warning chunk JS */
        const warningRes = await axios.get(warningChunkUrl, {
            headers: { "User-Agent": UA },
            timeout: 8000
        })

        /* 6. Extract key_ */
        const matchKey = warningRes.data.match(/key_[a-f0-9]+/i)
        if (!matchKey) throw new Error("Could not find embedKey pattern in warning chunk")

        cachedEmbedKey = matchKey[0]
        return cachedEmbedKey
    } catch (e) {
        /* Fallback to original hardcoded key */
        cachedEmbedKey = "key_c90081fa77254eb5"
        return cachedEmbedKey
    }
}

async function apiGet(path, params = {}) {
    const url = `${BASE_URL}${path}`
    const response = await axios.get(url, { headers: HEADERS, params, timeout: 15000 })
    return response.data
}

async function getHomepage() {
    const [featured, topReels] = await Promise.all([
        apiGet("/api/featured"),
        apiGet("/api/top-reels")
    ])

    return {
        featured: featured.featured || {},
        topReels: {
            trending: topReels.trending || [],
            topOverall: topReels.topOverall || [],
            country: topReels.country || ""
        }
    }
}

async function search(query, page = 1) {
    const data = await apiGet("/api/search/smart", {
        q: query,
        page: String(page)
    })

    return {
        query,
        page: parseInt(page),
        total: data.results?.length || 0,
        results: data.results || []
    }
}

async function getDetails(id, type = "movie") {
    const cleanType = type === "tv" ? "tv" : "movie"

    const [details, credits] = await Promise.all([
        apiGet(`/api/tmdb/${cleanType}/${id}`),
        apiGet(`/api/tmdb/${cleanType}/${id}/credits`)
    ])

    return {
        id: String(id),
        type: cleanType,
        title: details.title || details.name || "",
        originalTitle: details.original_title || details.original_name || "",
        overview: details.overview || "",
        poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
        backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : null,
        rating: details.vote_average || null,
        releaseDate: details.release_date || details.first_air_date || "",
        genres: details.genres || [],
        cast: credits.cast || [],
        crew: credits.crew || []
    }
}

async function getEpisodes(tvId, seasonNum) {
    const data = await apiGet(`/api/tmdb/tv/${tvId}/season/${seasonNum}`)
    return {
        tvId: String(tvId),
        seasonNumber: parseInt(seasonNum),
        episodes: (data.episodes || []).map(ep => ({
            id: ep.id,
            episodeNumber: ep.episode_number,
            name: ep.name || "",
            overview: ep.overview || "",
            airDate: ep.air_date || "",
            rating: ep.vote_average || null,
            stillPath: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null
        }))
    }
}

async function getStreamUrls(id, type = "movie", seasonNum = null, episodeNum = null, language = "english") {
    const isTv = type === "tv"
    const subParam = language === "english" ? "&sub=en" : ""
    const embedKey = await getEmbedKey()

    const players = [
        { key: "strigil", label: "Strigil", quality: "4K HDR" },
        { key: "videasy", label: "VidEasy", quality: "4K" },
        { key: "vidsuper", label: "VidSuper", quality: "4K" },
        { key: "vidcore", label: "VidCore", quality: "1080p" },
        { key: "vidrock", label: "AdRock", quality: "1080p" },
        { key: "vidsrc0", label: "VidSrc", quality: "1080p" },
        { key: "vidlink", label: "VidLink", quality: "1080p" },
        { key: "vidfast", label: "VidUp", quality: "1080p" },
        { key: "vidnest", label: "VidNest", quality: "1080p" },
        { key: "vidify", label: "Vidify", quality: "1080p" },
        { key: "vidzee", label: "VidZee", quality: "1080p" }
    ]

    const resolvedUrls = []

    for (const player of players) {
        let streamUrl = ""

        if (!isTv) {
            switch (player.key) {
                case "strigil": streamUrl = `https://strigil.cc/embed/movie/${id}?embedKey=${embedKey}&autoPlay=true&theme=16A085${subParam}`; break
                case "vidfast": streamUrl = `https://vidup.to/movie/${id}?autoPlay=true&theme=16A085${subParam}`; break
                case "vidsuper": streamUrl = `https://vidsuper.net/movie/${id}?overlay=true&color=16A085`; break
                case "videasy": streamUrl = `https://player.videasy.net/movie/${id}?overlay=true&color=16A085`; break
                case "vidcore": streamUrl = `https://vidcore.net/movie/${id}?autoPlay=true${subParam}`; break
                case "vidsrc0": streamUrl = `https://vidsrc.mov/embed/movie/${id}`; break
                case "vidrock": streamUrl = `https://vidrock.net/movie/${id}`; break
                case "vidnest": streamUrl = `https://vidnest.fun/movie/${id}`; break
                case "vidlink": streamUrl = `https://vidlink.pro/movie/${id}`; break
                case "vidify": streamUrl = `https://player.vidify.top/embed/movie/${id}`; break
                case "vidzee": streamUrl = `https://player.vidzee.wtf/embed/movie/${id}`; break
            }
        } else {
            if (seasonNum === null || episodeNum === null) continue
            const s = seasonNum
            const ep = episodeNum

            switch (player.key) {
                case "strigil": streamUrl = `https://strigil.cc/embed/tv/${id}/${s}/${ep}?embedKey=${embedKey}&autoPlay=true&theme=16A085${subParam}`; break
                case "vidfast": streamUrl = `https://vidup.to/tv/${id}/${s}/${ep}?autoPlay=true&theme=16A085&nextButton=true&autoNext=true${subParam}`; break
                case "vidsuper": streamUrl = `https://vidsuper.net/tv/${id}/${s}/${ep}?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true&skip_intro=true&color=16A085`; break
                case "videasy": streamUrl = `https://player.videasy.net/tv/${id}/${s}/${ep}?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true&color=16A085`; break
                case "vidcore": streamUrl = `https://vidcore.net/tv/${id}/${s}/${ep}?autoPlay=true${subParam}`; break
                case "vidsrc0": streamUrl = `https://vidsrc.mov/embed/tv/${id}/${s}/${ep}`; break
                case "vidrock": streamUrl = `https://vidrock.net/tv/${id}/${s}/${ep}`; break
                case "vidnest": streamUrl = `https://vidnest.fun/tv/${id}/${s}/${ep}`; break
                case "vidlink": streamUrl = `https://vidlink.pro/tv/${id}/${s}/${ep}`; break
                case "vidify": streamUrl = `https://player.vidify.top/embed/tv/${id}/${s}/${ep}`; break
                case "vidzee": streamUrl = `https://player.vidzee.wtf/embed/tv/${id}/${s}/${ep}`; break
            }
        }

        if (streamUrl) {
            resolvedUrls.push({
                server: player.label,
                quality: player.quality,
                url: streamUrl
            })
        }
    }

    return resolvedUrls
}

export default {
    route: {
        method: "get",
        path: "/anime/7reels",
        auth: false,
        tags: ["Anime"],
        summary: "Search movies via 7Reels",
        description: "Fetch movie/TV data from 7Reels (7reels.cc). Supports home, search, detail, episodes, and stream endpoints. Dynamically extracts embedKey from JS bundles for streaming URLs.",
        parameters: [
            { name: "type", in: "query", required: false, description: "Action type: home, search, detail, episodes, stream (default: home)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword (required for type=search)", schema: { type: "string" } },
            { name: "id", in: "query", required: false, description: "TMDB ID of movie/TV (required for type=detail, episodes, stream)", schema: { type: "string" } },
            { name: "mediaType", in: "query", required: false, description: "Media type: movie or tv (default: movie)", schema: { type: "string" } },
            { name: "season", in: "query", required: false, description: "Season number (for TV episodes/stream)", schema: { type: "string" } },
            { name: "episode", in: "query", required: false, description: "Episode number (for TV stream)", schema: { type: "string" } },
            { name: "language", in: "query", required: false, description: "Subtitle language: english or other (default: english)", schema: { type: "string" } },
            { name: "page", in: "query", required: false, description: "Page number for search (default: 1)", schema: { type: "string" } },
        ],
        responses: {
            "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, result: { type: "object" } } } } } },
            "400": { description: "Bad request", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } } }
        }
    },
    handler: async (req, res) => {
        const { type, query, id, mediaType, season, episode, language, page } = req.query
        const action = type || "home"
        const pageNum = parseInt(page) || 1
        const mType = mediaType || "movie"

        try {
            let result
            switch (action) {
                case "home":
                    result = await getHomepage()
                    break
                case "search":
                    if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi untuk search" })
                    result = await search(query, pageNum)
                    break
                case "detail":
                    if (!id) return res.status(400).json({ ok: false, error: "id (TMDB ID) wajib diisi untuk detail" })
                    result = await getDetails(id, mType)
                    break
                case "episodes":
                    if (!id || mType !== "tv") return res.status(400).json({ ok: false, error: "id (TMDB TV ID) wajib diisi dan mediaType=tv untuk episodes" })
                    result = await getEpisodes(id, parseInt(season) || 1)
                    break
                case "stream":
                    if (!id) return res.status(400).json({ ok: false, error: "id (TMDB ID) wajib diisi untuk stream" })
                    const sNum = mType === "tv" ? parseInt(season) || null : null
                    const eNum = mType === "tv" ? parseInt(episode) || null : null
                    if (mType === "tv" && (sNum === null || eNum === null)) {
                        return res.status(400).json({ ok: false, error: "season dan episode wajib diisi untuk TV stream" })
                    }
                    result = await getStreamUrls(id, mType, sNum, eNum, language || "english")
                    break
                default:
                    return res.status(400).json({ ok: false, error: `type "${action}" tidak valid. Gunakan: home, search, detail, episodes, stream` })
            }
            res.json({ ok: true, result })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

import axios from "axios"

const HURA_DOMAIN = "https://hurawatch.sx"
const FALLBACK_API_KEY = "9e7096a7575623aa30c66e9cc987e411"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

const GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
    10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
    10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics"
}

const SERVER_PATTERNS = {
    "Server_1_VidCore": { movie: "https://vidcore.net/movie/", tv: "https://vidcore.net/tv/", suffix: "?autoPlay=true" },
    "Server_2_VidGod": { movie: "https://vidgod.net/movie/", tv: "https://vidgod.net/tv/", suffix: "" },
    "Server_3_VidNest": { movie: "https://vidnest.fun/movie/", tv: "https://vidnest.fun/tv/", suffix: "" },
    "Server_4_VidFast": { movie: "https://vidfast.pro/movie/", tv: "https://vidfast.pro/tv/", suffix: "?autoPlay=true" },
    "Server_5_VidSrcEmbed": { movie: "https://vidsrc-embed.ru/embed/movie/", tv: "https://vidsrc-embed.ru/embed/tv/", suffix: "" },
    "Server_6_VidEasy": { movie: "https://player.videasy.net/movie/", tv: "https://player.videasy.net/tv/", suffix: "" }
}

async function getApiKey() {
    try {
        const response = await axios.get(`${HURA_DOMAIN}/config.js`, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
            timeout: 5000
        })
        const text = response.data
        const match = text.match(/TMDB_API_KEY\s*:\s*['"]([a-f0-9]+)['"]/i)
        if (match && match[1]) return match[1]
    } catch (e) {
        // Fallback
    }
    return FALLBACK_API_KEY
}

function generateStreams(id, type, season = 1, episode = 1) {
    const streams = {}
    for (const [server, patterns] of Object.entries(SERVER_PATTERNS)) {
        if (type === "movie") {
            streams[server] = `${patterns.movie}${id}${patterns.suffix}`
        } else {
            streams[server] = `${patterns.tv}${id}/${season}/${episode}${patterns.suffix}`
        }
    }
    return streams
}

function formatItem(item, typeOverride = null) {
    const mediaType = typeOverride || item.media_type || (item.title ? "movie" : "tv")
    const title = item.title || item.name || "Untitled"
    const originalTitle = item.original_title || item.original_name || title
    const year = (item.release_date || item.first_air_date || "").split("-")[0] || "N/A"
    const rating = item.vote_average ? parseFloat(item.vote_average.toFixed(1)) : 0.0
    const genres = (item.genre_ids || []).map(id => GENRE_MAP[id] || id)
    const poster = item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : null
    const backdrop = item.backdrop_path ? `${IMAGE_BASE_URL.replace("w500", "original")}${item.backdrop_path}` : null

    return {
        id: item.id,
        title,
        original_title: originalTitle,
        type: mediaType,
        year,
        rating,
        genres,
        overview: item.overview || "",
        poster_url: poster,
        backdrop_url: backdrop,
        streams: generateStreams(item.id, mediaType)
    }
}

async function fetchEndpoint(apiKey, path, params = {}) {
    const queryParams = new URLSearchParams({ api_key: apiKey, ...params })
    const url = `${TMDB_BASE_URL}/${path}?${queryParams}`
    const response = await axios.get(url)
    return response.data
}

async function performSearch(apiKey, query, page = 1) {
    const data = await fetchEndpoint(apiKey, "search/multi", { query, page })
    const filteredResults = data.results
        .filter(item => item.media_type !== "person")
        .map(item => formatItem(item))

    return {
        query,
        page: data.page,
        total_pages: data.total_pages,
        total_results: data.total_results,
        results: filteredResults
    }
}

async function scrapeMovieDetail(apiKey, id) {
    const details = await fetchEndpoint(apiKey, `movie/${id}`)
    const credits = await fetchEndpoint(apiKey, `movie/${id}/credits`)
    const similar = await fetchEndpoint(apiKey, `movie/${id}/similar`)

    const formattedCast = (credits.cast || []).slice(0, 10).map(c => ({
        name: c.name,
        character: c.character,
        profile_url: c.profile_path ? `${IMAGE_BASE_URL}${c.profile_path}` : null
    }))

    const formattedDirectors = (credits.crew || [])
        .filter(c => c.job === "Director")
        .map(c => c.name)

    const formattedSimilar = (similar.results || []).slice(0, 10).map(item => formatItem(item, "movie"))

    const formattedDetails = formatItem(details, "movie")
    formattedDetails.genres = (details.genres || []).map(g => g.name)
    formattedDetails.cast = formattedCast
    formattedDetails.directors = formattedDirectors
    formattedDetails.similar_movies = formattedSimilar
    formattedDetails.tagline = details.tagline || ""
    formattedDetails.status = details.status || ""
    formattedDetails.budget = details.budget || 0
    formattedDetails.revenue = details.revenue || 0
    formattedDetails.runtime_minutes = details.runtime || 0

    return formattedDetails
}

async function scrapeTVDetail(apiKey, id) {
    const details = await fetchEndpoint(apiKey, `tv/${id}`)
    const credits = await fetchEndpoint(apiKey, `tv/${id}/credits`)
    const similar = await fetchEndpoint(apiKey, `tv/${id}/similar`)

    const formattedCast = (credits.cast || []).slice(0, 10).map(c => ({
        name: c.name,
        character: c.character,
        profile_url: c.profile_path ? `${IMAGE_BASE_URL}${c.profile_path}` : null
    }))

    const formattedCreators = (details.created_by || []).map(c => c.name)
    const formattedSimilar = (similar.results || []).slice(0, 10).map(item => formatItem(item, "tv"))

    const seasons = []
    const numSeasons = details.number_of_seasons || 0

    for (let s = 1; s <= Math.min(numSeasons, 3); s++) {
        try {
            const seasonData = await fetchEndpoint(apiKey, `tv/${id}/season/${s}`)
            const episodes = (seasonData.episodes || []).map(ep => ({
                id: ep.id,
                episode_number: ep.episode_number,
                name: ep.name,
                overview: ep.overview || "",
                air_date: ep.air_date || "N/A",
                rating: ep.vote_average ? parseFloat(ep.vote_average.toFixed(1)) : 0.0,
                still_path: ep.still_path ? `${IMAGE_BASE_URL}${ep.still_path}` : null,
                streams: generateStreams(id, "tv", s, ep.episode_number)
            }))
            seasons.push({
                season_number: s,
                name: seasonData.name || `Season ${s}`,
                overview: seasonData.overview || "",
                air_date: seasonData.air_date || "N/A",
                poster_url: seasonData.poster_path ? `${IMAGE_BASE_URL}${seasonData.poster_path}` : null,
                episodes
            })
        } catch (err) {
            // Skip failed season
        }
    }

    const formattedDetails = formatItem(details, "tv")
    formattedDetails.genres = (details.genres || []).map(g => g.name)
    formattedDetails.cast = formattedCast
    formattedDetails.creators = formattedCreators
    formattedDetails.similar_shows = formattedSimilar
    formattedDetails.number_of_seasons = details.number_of_seasons || 0
    formattedDetails.number_of_episodes = details.number_of_episodes || 0
    formattedDetails.status = details.status || ""
    formattedDetails.seasons = seasons

    return formattedDetails
}

export default {
    route: {
        method: "get",
        path: "/anime/hurawatch",
        auth: false,
        tags: ["Anime"],
        summary: "Search movies & TV shows via Hurawatch (TMDB)",
        description: "Search movies and TV shows, or get detailed info (cast, directors, seasons, episodes, stream links) via the Hurawatch TMDB-based API",
        parameters: [
            { name: "type", in: "query", required: false, description: "Action type: search or detail (default: search)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword (required for search)", schema: { type: "string" } },
            { name: "id", in: "query", required: false, description: "TMDB ID (required for detail)", schema: { type: "string" } },
            { name: "media_type", in: "query", required: false, description: "Media type for detail: movie or tv (default: movie)", schema: { type: "string" } },
            { name: "page", in: "query", required: false, description: "Page number for search (default: 1)", schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, result: { type: "object" } } } } } } }
    },
    handler: async (req, res) => {
        const { type, query, id, media_type, page } = req.query
        const action = type || "search"

        try {
            const apiKey = await getApiKey()

            if (action === "search") {
                if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi untuk search" })
                const result = await performSearch(apiKey, query, parseInt(page) || 1)
                return res.json({ ok: true, result })
            }

            if (action === "detail") {
                if (!id) return res.status(400).json({ ok: false, error: "id wajib diisi untuk detail" })
                const mt = media_type || "movie"
                if (mt === "tv") {
                    const result = await scrapeTVDetail(apiKey, id)
                    return res.json({ ok: true, result })
                }
                const result = await scrapeMovieDetail(apiKey, id)
                return res.json({ ok: true, result })
            }

            return res.status(400).json({ ok: false, error: `type "${action}" tidak valid. Gunakan: search, detail` })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

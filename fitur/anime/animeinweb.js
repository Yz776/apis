import axios from "axios"

const BASE_URL = "https://animeinweb.com/api/proxy/"
const SECRET_HEADER = "animein-secure-proxy-key-123"

async function apiGet(endpoint, params = {}) {
    let url = `${BASE_URL}${endpoint}`

    const searchParams = new URLSearchParams()
    for (const [key, val] of Object.entries(params)) {
        searchParams.append(key, val)
    }
    const queryString = searchParams.toString()
    if (queryString) {
        url += `?${queryString}`
    }

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "x-proxy-secret": SECRET_HEADER,
        "Accept": "application/json, text/plain, */*"
    }

    const response = await axios.get(url, { headers })
    const responseData = response.data
    if (responseData && responseData.status === 200 && !responseData.error) {
        return responseData.data
    }
    throw new Error(responseData?.message || `API error with status ${response.status}`)
}

async function getHomepage() {
    const data = await apiGet("3/2/home/data")
    return {
        hot: data.hot || [],
        new: data.new || [],
        today: data.today || [],
        popular: data.popular || [],
        trailer: data.trailer || [],
        random: data.random || []
    }
}

async function searchAnime(query, page = 0, sort = "views", genreIds = []) {
    const params = {
        keyword: query,
        page: String(page),
        sort: sort
    }

    const genreList = Array.isArray(genreIds) ? genreIds : [genreIds]
    if (genreList.length > 0) {
        params.genre_in = genreList.join(",")
    }

    const data = await apiGet("3/2/explore/movie", params)
    return {
        query,
        page,
        sort,
        genreIds: genreList,
        results: data.movie || []
    }
}

async function getAnimeDetails(animeId) {
    const data = await apiGet(`3/2/movie/detail/${animeId}`)
    return data.movie || null
}

async function getEpisodes(animeId) {
    const data = await apiGet(`3/2/movie/episode/${animeId}`)
    return data.episode || []
}

async function getEpisodeStream(episodeId) {
    const data = await apiGet(`3/2/episode/streamnew/${episodeId}`)
    return {
        episode: data.episode || null,
        episodeNext: data.episode_next || null,
        servers: data.server || []
    }
}

async function getSchedule(day = "MINGGU") {
    let mappedDay = day.toUpperCase()
    const map = {
        "MONDAY": "SENIN",
        "TUESDAY": "SELASA",
        "WEDNESDAY": "RABU",
        "THURSDAY": "KAMIS",
        "FRIDAY": "JUMAT",
        "SATURDAY": "SABTU",
        "SUNDAY": "MINGGU"
    }
    if (map[mappedDay]) {
        mappedDay = map[mappedDay]
    }
    const params = { day: mappedDay }
    const data = await apiGet("3/2/schedule/data", params)
    return data.movie || []
}

async function getGenres() {
    const data = await apiGet("3/2/explore/genre")
    return data.genre || []
}

export default {
    route: {
        method: "get",
        path: "/anime/animeinweb",
        auth: false,
        tags: ["Anime"],
        summary: "Anime data via Animeinweb API",
        description: "Fetch anime homepage, search, details, episodes, streams, schedule, and genres via the Animeinweb proxy API",
        parameters: [
            { name: "endpoint", in: "query", required: false, description: "Action: home, search, detail, episodes, stream, schedule, genres (default: home)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword (for search endpoint)", schema: { type: "string" } },
            { name: "id", in: "query", required: false, description: "Anime or episode ID (for detail/episodes/stream)", schema: { type: "string" } },
            { name: "page", in: "query", required: false, description: "Page number for search (default: 0)", schema: { type: "string" } },
            { name: "sort", in: "query", required: false, description: "Sort field for search: views, latest, favorites (default: views)", schema: { type: "string" } },
            { name: "day", in: "query", required: false, description: "Day for schedule: SENIN-INGGU or English names (default: MINGGU)", schema: { type: "string" } },
            { name: "genre_in", in: "query", required: false, description: "Comma-separated genre IDs for search filter", schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, result: { type: "object" } } } } } } }
    },
    handler: async (req, res) => {
        const { endpoint, query, id, page, sort, day, genre_in } = req.query
        const action = endpoint || "home"

        try {
            let result
            switch (action) {
                case "home":
                    result = await getHomepage()
                    break
                case "search":
                    if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi untuk search" })
                    const genreIds = genre_in ? genre_in.split(",") : []
                    result = await searchAnime(query, parseInt(page) || 0, sort || "views", genreIds)
                    break
                case "detail":
                    if (!id) return res.status(400).json({ ok: false, error: "id wajib diisi untuk detail" })
                    result = await getAnimeDetails(id)
                    break
                case "episodes":
                    if (!id) return res.status(400).json({ ok: false, error: "id wajib diisi untuk episodes" })
                    result = await getEpisodes(id)
                    break
                case "stream":
                    if (!id) return res.status(400).json({ ok: false, error: "id wajib diisi untuk stream" })
                    result = await getEpisodeStream(id)
                    break
                case "schedule":
                    result = await getSchedule(day || "MINGGU")
                    break
                case "genres":
                    result = await getGenres()
                    break
                default:
                    return res.status(400).json({ ok: false, error: `endpoint "${action}" tidak valid. Gunakan: home, search, detail, episodes, stream, schedule, genres` })
            }
            res.json({ ok: true, result })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

import axios from "axios"

const BASE_URL = "https://h5-api.aoneroom.com"
const PLAY_HOST = "https://themoviebox.xyz"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

let cachedToken = null

const RANKING_LISTS = {
    TRENDING_NOW: "872031290915189720",
    TRENDING_MOVIE: "8821254238245470240",
    TRENDING_DRAMA: "8617025562613270856",
    TRENDING_ANIME: "567783349092340776",
    INDO_FILM: "6528093688173053896",
    K_DRAMA: "4380734070238626200",
    INDO_DRAMA: "5283462032510044280",
    ANIME: "8617025562613270856",
    HOLLYWOOD: "1469286917119311888",
    C_DRAMA: "8624142774394406504",
    INDO_HORROR: "5848753831881965888",
    THAI_DRAMA: "1164329479448281992",
    SHORT_TV: "567783349092340776",
    FUNNY_HORROR_CRIME: "3528002473103362040",
    INDO_DUBBED: "5549742004948601072",
    RECENTLY_ADDED: "4019055174353407000",
    INDONESIAN_KILLERS: "5863917898430924656",
    HAPPY_LIFE: "4993310637209048808",
    RUN_ESCAPE_DEATH: "8703838933408530536",
    BAD_ROMANCE: "4539350473970797944",
    CYBERPUNK: "3766111568753312664",
    MONSTER_TITAN: "1653005382303864120",
    SEA_ADVENTURE: "6708972608207443352"
}

async function initToken() {
    const homeUrl = `${BASE_URL}/wefeed-h5api-bff/home?host=themoviebox.xyz`
    const res = await axios.get(homeUrl, {
        headers: { "User-Agent": UA },
        timeout: 10000
    })

    const setCookie = res.headers["set-cookie"]
    if (setCookie) {
        const cookies = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie
        const match = cookies.match(/token=([^;]+)/)
        if (match) {
            cachedToken = match[1]
            return cachedToken
        }
    }

    const xUser = res.headers["x-user"]
    if (xUser) {
        try {
            const parsed = JSON.parse(xUser)
            if (parsed.token) {
                cachedToken = parsed.token
                return cachedToken
            }
        } catch (e) { /* ignore */ }
    }

    throw new Error("Failed to retrieve token from Home API")
}

async function apiRequest(path, options = {}) {
    if (!cachedToken) await initToken()

    const url = path.startsWith("http") ? path : `${BASE_URL}${path}`
    const headers = {
        "Content-Type": "application/json",
        "User-Agent": UA,
        "Authorization": `Bearer ${cachedToken}`,
        ...options.headers
    }

    const config = { ...options, headers, timeout: 15000 }
    const method = options.method || "GET"

    let res
    if (method === "POST") {
        res = await axios.post(url, options.body ? JSON.parse(options.body) : {}, config)
    } else {
        res = await axios.get(url, config)
    }

    let data = res.data

    // Auto re-authenticate if token expired
    if (data && (data.code === 400 || data.message === "invalid token")) {
        await initToken()
        headers["Authorization"] = `Bearer ${cachedToken}`
        config.headers = headers
        if (method === "POST") {
            res = await axios.post(url, options.body ? JSON.parse(options.body) : {}, config)
        } else {
            res = await axios.get(url, config)
        }
        data = res.data
    }

    return data
}

async function apiGet(path, searchParams = {}) {
    const query = new URLSearchParams(searchParams).toString()
    const fullPath = query ? `${path}?${query}` : path
    return apiRequest(fullPath, { method: "GET" })
}

async function apiPost(path, body = {}) {
    return apiRequest(path, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
    })
}

async function getHome() {
    return apiGet("/wefeed-h5api-bff/home", { host: "themoviebox.xyz" })
}

async function getTrending(page = 0, perPage = 18) {
    return apiGet("/wefeed-h5api-bff/subject/trending", { page, perPage })
}

async function search(query, page = 1, perPage = 10) {
    return apiPost("/wefeed-h5api-bff/subject/search", { keyword: query, page, perPage, subjectType: 0 })
}

async function getDetail(detailPath) {
    return apiGet("/wefeed-h5api-bff/detail", { detailPath })
}

async function getStream(subjectId, detailPath, se = 0, ep = 0) {
    const slug = detailPath.split("/").filter(Boolean).pop() || detailPath
    const referer = `${PLAY_HOST}/movies/${slug}`
    const playUrl = `${PLAY_HOST}/wefeed-h5api-bff/subject/play`
    return apiGet(playUrl, {
        subjectId,
        se,
        ep,
        detailPath,
        streamSignType: 1
    }, { Referer: referer })
}

async function getRankingList(rankingListId, page = 1, perPage = 12) {
    return apiGet("/wefeed-h5api-bff/ranking-list/content", { id: rankingListId, page, perPage })
}

export default {
    route: {
        method: "get",
        path: "/anime/moviebox",
        auth: false,
        tags: ["Anime"],
        summary: "Search movies via Moviebox",
        description: "Fetch movie/series data from Moviebox (h5-api.aoneroom.com). Supports home, trending, search, detail, stream, and ranking endpoints. Auto-initializes JWT token from home endpoint.",
        parameters: [
            { name: "type", in: "query", required: false, description: "Action type: home, trending, search, detail, stream, ranking (default: home)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword (required for type=search)", schema: { type: "string" } },
            { name: "id", in: "query", required: false, description: "Detail path or subjectId (required for type=detail and type=stream)", schema: { type: "string" } },
            { name: "detailPath", in: "query", required: false, description: "Detail path slug for stream endpoint", schema: { type: "string" } },
            { name: "ranking", in: "query", required: false, description: "Ranking list name (e.g. TRENDING_NOW) or ID", schema: { type: "string" } },
            { name: "page", in: "query", required: false, description: "Page number (default: 1)", schema: { type: "string" } },
            { name: "se", in: "query", required: false, description: "Season number for stream (default: 0)", schema: { type: "string" } },
            { name: "ep", in: "query", required: false, description: "Episode number for stream (default: 0)", schema: { type: "string" } },
        ],
        responses: {
            "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, result: { type: "object" } } } } } },
            "400": { description: "Bad request", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } } }
        }
    },
    handler: async (req, res) => {
        const { type, query, id, detailPath, ranking, page, se, ep } = req.query
        const action = type || "home"
        const pageNum = parseInt(page) || 1

        try {
            let result
            switch (action) {
                case "home":
                    result = await getHome()
                    break
                case "trending":
                    result = await getTrending(pageNum - 1, 18)
                    break
                case "search":
                    if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi untuk search" })
                    result = await search(query, pageNum)
                    break
                case "detail":
                    if (!id) return res.status(400).json({ ok: false, error: "id (detailPath) wajib diisi untuk detail" })
                    result = await getDetail(id)
                    break
                case "stream":
                    if (!id || !detailPath) return res.status(400).json({ ok: false, error: "id (subjectId) dan detailPath wajib diisi untuk stream" })
                    result = await getStream(id, detailPath, parseInt(se) || 0, parseInt(ep) || 0)
                    break
                case "ranking":
                    const rankingId = RANKING_LISTS[ranking] || ranking || RANKING_LISTS.TRENDING_NOW
                    result = await getRankingList(rankingId, pageNum)
                    break
                default:
                    return res.status(400).json({ ok: false, error: `type "${action}" tidak valid. Gunakan: home, trending, search, detail, stream, ranking` })
            }
            res.json({ ok: true, result })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

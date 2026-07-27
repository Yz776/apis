import crypto from "crypto"

const API_BASE = "https://apiweb.flickreels.net"
const SIGN_SALT = "nW8GqjbdSYRI"

function generateUUID() {
    return crypto.randomUUID()
}

function md5(str) {
    return crypto.createHash("md5").update(str).digest("hex")
}

function signPayload(payload) {
    const sortedKeys = Object.keys(payload).sort()
    const parts = []
    for (const key of sortedKeys) {
        parts.push(`${key}=${payload[key]}`)
    }
    const payloadStr = parts.join("&") + `&signSalt=${SIGN_SALT}`
    return md5(payloadStr).toLowerCase()
}

async function apiPost(path, payload) {
    const url = `${API_BASE}${path}`
    const sign = signPayload(payload)

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.flickreels.net/",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "web-system": "pc",
        "sign": sign
    }

    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
    })
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    if (data && data.status_code === 1) {
        return data.data
    }
    throw new Error(data?.msg || `API error with status ${data?.status_code}`)
}

async function getHomepage(page = 1, pageSize = 20) {
    const payload = {
        page: String(page),
        page_size: String(pageSize),
        guid: generateUUID(),
        language_id: "6",
        os: "pc"
    }
    const data = await apiPost("/web/playlet/morePlayletList", payload)
    return {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: data.playlet_total || 0,
        dramas: data.playlet_list || []
    }
}

async function searchDrama(query) {
    const payload = {
        page: "1",
        page_size: "200",
        guid: generateUUID(),
        language_id: "6",
        os: "pc"
    }
    const data = await apiPost("/web/playlet/morePlayletList", payload)
    const list = data.playlet_list || []
    const keyword = query.toLowerCase().trim()
    const results = list.filter(item => {
        const title = (item.title || "").toLowerCase()
        const intro = (item.introduce || "").toLowerCase()
        return title.includes(keyword) || intro.includes(keyword)
    })
    return { query, total: results.length, results }
}

async function getDramaDetails(playletId) {
    const payload = {
        playlet_id: String(playletId),
        guid: generateUUID(),
        language_id: "6",
        os: "pc"
    }
    const data = await apiPost("/web/playlet/chapterList", payload)
    return {
        playletId: data.playlet_id,
        title: data.title,
        cover: data.cover,
        status: data.status,
        uploadNum: data.upload_num,
        startPayNum: data.start_pay_num,
        introduce: data.introduce,
        genres: (data.tag_name || []).map(tag => tag.name || tag),
        episodes: (data.list || []).map(ep => ({
            episodeNum: ep.chapter_num,
            episodeTitle: ep.chapter_title,
            chapterId: ep.chapter_id,
            cover: ep.chapter_cover,
            isLocked: ep.is_lock === 1,
            introduce: ep.introduce
        }))
    }
}

async function getEpisodeStream(playletId, chapterId) {
    const payload = {
        chapter_id: String(chapterId),
        guid: generateUUID(),
        language_id: "6",
        os: "pc",
        playlet_id: String(playletId)
    }
    const data = await apiPost("/web/playlet/play", payload)
    return {
        chapterId: data.chapter_id,
        title: data.chapter_title,
        episodeNum: data.chapter_num,
        hlsUrl: data.hls_url || null,
        isLocked: data.is_need_pay === 1 || !data.hls_url,
        cover: data.chapter_cover,
        duration: data.total_duration
    }
}

async function flickreels(url) {
    if (!url) throw new Error("URL wajib diisi")

    const isUrl = url.startsWith("http://") || url.startsWith("https://")

    if (isUrl) {
        // Try to parse as direct FlickReels URL — extract IDs from URL pattern
        // Example: https://www.flickreels.net/play/12345/67890
        const match = url.match(/flickreels\.net\/play\/(\d+)\/(\d+)/)
        if (match) {
            const playletId = match[1]
            const chapterId = match[2]
            const details = await getDramaDetails(playletId)
            const stream = await getEpisodeStream(playletId, chapterId)
            return { type: "episode_stream", details, stream }
        }

        // Try drama URL pattern: https://www.flickreels.net/drama/12345
        const dramaMatch = url.match(/flickreels\.net\/(?:drama|playlet)\/(\d+)/)
        if (dramaMatch) {
            const playletId = dramaMatch[1]
            return { type: "drama_details", ...(await getDramaDetails(playletId)) }
        }

        throw new Error("Format URL FlickReels tidak dikenali")
    }

    // Treat as search query
    const results = await searchDrama(url)
    return { type: "search", ...results }
}

export default {
    route: {
        method: "get",
        path: "/downloader/flickreels",
        auth: false,
        tags: ["Downloader"],
        summary: "Download video dari FlickReels",
        description: "Mengunduh video/drama dari FlickReels. Bisa menggunakan URL FlickReels (drama atau episode) atau kata kunci pencarian. Mendukung pencarian drama, detail drama, dan streaming link episode.",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL FlickReels (drama/episode) atau kata kunci pencarian",
                schema: { type: "string", example: "https://www.flickreels.net/drama/12345" }
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
        const { url } = req.query
        if (!url) return res.status(400).json({ ok: false, error: "url wajib diisi" })
        try {
            const result = await flickreels(url)
            res.json({ ok: true, result })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

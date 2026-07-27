import axios from "axios"
import * as cheerio from "cheerio"

const BASE_URL = "https://x6.sokuja.uk/"

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": BASE_URL
}

function getImgSrc(img) {
    if (!img) return ""
    const src = img.attr("src") || ""
    if (src.startsWith("http")) return src
    if (src.startsWith("/_next/image")) {
        const decoded = decodeURIComponent(src)
        const match = decoded.match(/url=(.*?)&/)
        if (match) return match[1]
    }
    return src
}

function parseSliderItem($, el) {
    const card = $(el)
    const link = card.find("a").first()
    const href = link.attr("href") || ""
    const img = card.find("img").first()

    const genres = []
    card.find("div.mt-2.flex a").each((i, ael) => {
        genres.push($(ael).text().trim())
    })

    const ratingText = card.find("span:contains('★')").text().replace("★", "").trim()

    return {
        title: card.find("h3").text().trim(),
        slug: href.replace(/^\/anime\//, "").replace(/\/$/, ""),
        url: href ? `${BASE_URL.replace(/\/$/, "")}${href}` : "",
        image: getImgSrc(img),
        genres,
        type: card.find("span").eq(1).text().trim(),
        score: ratingText || null,
        synopsis: card.find("p.mt-2").text().trim()
    }
}

function parseLatestCard($, el) {
    const card = $(el)
    const href = card.attr("href") || ""
    const img = card.find("img").first()

    const epText = card.find("span.absolute.left-2").text().replace("EP", "").trim()
    const typeText = card.find("span.absolute.right-2").text().trim()
    const statusText = card.find("span.absolute.bottom-0").text().trim()
    const metaText = card.find("div.mt-0.5").text().trim()
    const date = metaText.replace(/Episode\s+\d+/i, "").replace(/^[\s·•\-\.]+/g, "").trim()

    return {
        title: card.find("h3").text().trim(),
        slug: href.replace(/^\//, "").replace(/\/$/, ""),
        url: href ? `${BASE_URL.replace(/\/$/, "")}${href}` : "",
        image: getImgSrc(img),
        episode: epText || null,
        type: typeText || null,
        status: statusText || null,
        date: date || null
    }
}

function parseGridCard($, el) {
    const card = $(el)
    const href = card.attr("href") || ""
    const img = card.find("img").first()

    const typeText = card.find("span.absolute.left-2").text().trim()
    const ratingText = card.find("span.absolute.right-2").text().replace("★", "").trim()
    const statusText = card.find("span.absolute.bottom-0").text().trim()

    return {
        title: card.find("h3").text().trim(),
        slug: href.replace(/^\/anime\//, "").replace(/\/$/, ""),
        url: href ? `${BASE_URL.replace(/\/$/, "")}${href}` : "",
        image: getImgSrc(img),
        type: typeText || null,
        score: ratingText || null,
        status: statusText || null,
        year: card.find("p.text-xs").text().trim()
    }
}

async function fetchPage(url, params = {}) {
    const response = await axios.get(url, { headers: HEADERS, params, timeout: 15000 })
    return response.data
}

async function getHomepage() {
    const html = await fetchPage(BASE_URL)
    const $ = cheerio.load(html)

    const slider = []
    $("#S\\:0 .snap-center").each((i, el) => {
        slider.push(parseSliderItem($, el))
    })

    const latest = []
    $("#S\\:1 a.group").each((i, el) => {
        latest.push(parseLatestCard($, el))
    })

    const ongoing = []
    $("#S\\:2 a.group").each((i, el) => {
        ongoing.push(parseGridCard($, el))
    })

    const completed = []
    $("#S\\:3 a.group").each((i, el) => {
        completed.push(parseGridCard($, el))
    })

    return { slider, latest, ongoing, completed }
}

async function getAnimeDetails(urlOrSlug) {
    let url = urlOrSlug
    if (!url.startsWith("http")) {
        const clean = urlOrSlug.replace(/^\/anime\//, "").replace(/^\//, "")
        url = `${BASE_URL}anime/${clean}/`
    }

    const html = await fetchPage(url)
    const $ = cheerio.load(html)

    const title = $("h1").first().text().replace("Subtitle Indonesia", "").trim()
    const altTitles = $("h1").first().next("p").text().trim()
    const posterImg = $("main img").first()
    const image = getImgSrc(posterImg)
    const score = $("main span.text-2xl.font-bold").text().trim()

    const genres = []
    $("main div.flex.flex-wrap.gap-2 a[href^='/genre/']").each((i, el) => {
        genres.push($(el).text().trim())
    })

    const meta = {}
    $("main dl div.flex").each((i, el) => {
        const key = $(el).find("dt").text().trim()
        const value = $(el).find("dd").text().trim()
        if (key) meta[key] = value
    })

    const synopsis = $("main div.prose.prose-invert").text().trim()

    const episodes = []
    $("main div.space-y-1 a").each((i, el) => {
        const href = $(el).attr("href") || ""
        episodes.push({
            title: $(el).find("span").first().text().trim(),
            slug: href.replace(/^\//, "").replace(/\/$/, ""),
            url: href ? `${BASE_URL.replace(/\/$/, "")}${href}` : "",
            date: $(el).find("span").eq(1).text().trim()
        })
    })

    return {
        title,
        altTitles,
        slug: urlOrSlug.replace(/^\/anime\//, "").replace(/^\//, "").replace(/\/$/, ""),
        url,
        image,
        score,
        genres,
        meta,
        synopsis,
        episodes
    }
}

async function getEpisodeDetails(urlOrSlug) {
    let url = urlOrSlug
    if (!url.startsWith("http")) {
        const clean = urlOrSlug.replace(/^\//, "")
        url = `${BASE_URL}${clean}/`
    }

    const html = await fetchPage(url)
    const $ = cheerio.load(html)

    const title = $("h1").first().text().trim()

    const downloads = []
    $("main div.rounded-xl.bg-sokuja-card.p-4 a").each((i, el) => {
        const resolution = $(el).find("span").text().trim()
        downloads.push({
            resolution,
            url: $(el).attr("href") || ""
        })
    })

    let episodeId = null
    let streams = []

    $("script").each((i, el) => {
        const content = $(el).html()
        if (content && content.includes("episodeId")) {
            const match = content.match(/\\?"episodeId\\?":\s*(\d+)/)
            if (match) {
                episodeId = parseInt(match[1])
            }
        }
    })

    if (episodeId) {
        const mirrorsUrl = `${BASE_URL}api/video-mirrors?e=${episodeId}`
        try {
            const mirrorsRes = await fetchPage(mirrorsUrl)
            if (mirrorsRes && mirrorsRes.mirrors) {
                streams = mirrorsRes.mirrors.map(m => ({
                    id: m.id,
                    server: m.serverName,
                    url: m.embedUrl,
                    type: m.embedType,
                    quality: m.quality
                }))
            }
        } catch (e) { /* ignore api fail */ }
    }

    return {
        title,
        slug: urlOrSlug.replace(/^\//, "").replace(/\/$/, ""),
        url,
        episodeId,
        streams,
        downloads
    }
}

async function searchAnime(query, page = 1) {
    const url = `${BASE_URL}anime/`
    const html = await fetchPage(url, { q: query, page })
    const $ = cheerio.load(html)

    const anime = []
    $("main .grid a.group").each((i, el) => {
        anime.push(parseGridCard($, el))
    })

    return { query, page: Number(page), anime }
}

async function getOngoingAnime(page = 1) {
    const url = `${BASE_URL}anime/?status=ongoing&order=update&page=${page}`
    const html = await fetchPage(url)
    const $ = cheerio.load(html)

    const anime = []
    $("main .grid a.group").each((i, el) => {
        anime.push(parseGridCard($, el))
    })

    return { page: Number(page), anime }
}

async function getCompletedAnime(page = 1) {
    const url = `${BASE_URL}anime/?status=completed&order=update&page=${page}`
    const html = await fetchPage(url)
    const $ = cheerio.load(html)

    const anime = []
    $("main .grid a.group").each((i, el) => {
        anime.push(parseGridCard($, el))
    })

    return { page: Number(page), anime }
}

export default {
    route: {
        method: "get",
        path: "/anime/sokuja",
        auth: false,
        tags: ["Anime"],
        summary: "Search anime via Sokuja",
        description: "Fetch anime data from Sokuja (x6.sokuja.uk). Supports home, search, detail, episode, ongoing, and completed endpoints using cheerio HTML scraping.",
        parameters: [
            { name: "type", in: "query", required: false, description: "Action type: home, search, detail, episode, ongoing, completed (default: home)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword (required for type=search)", schema: { type: "string" } },
            { name: "slug", in: "query", required: false, description: "Anime or episode slug (required for type=detail and type=episode)", schema: { type: "string" } },
            { name: "page", in: "query", required: false, description: "Page number for search/ongoing/completed (default: 1)", schema: { type: "string" } },
        ],
        responses: {
            "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, result: { type: "object" } } } } } },
            "400": { description: "Bad request", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } } }
        }
    },
    handler: async (req, res) => {
        const { type, query, slug, page } = req.query
        const action = type || "home"
        const pageNum = parseInt(page) || 1

        try {
            let result
            switch (action) {
                case "home":
                    result = await getHomepage()
                    break
                case "search":
                    if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi untuk search" })
                    result = await searchAnime(query, pageNum)
                    break
                case "detail":
                    if (!slug) return res.status(400).json({ ok: false, error: "slug wajib diisi untuk detail" })
                    result = await getAnimeDetails(slug)
                    break
                case "episode":
                    if (!slug) return res.status(400).json({ ok: false, error: "slug wajib diisi untuk episode" })
                    result = await getEpisodeDetails(slug)
                    break
                case "ongoing":
                    result = await getOngoingAnime(pageNum)
                    break
                case "completed":
                    result = await getCompletedAnime(pageNum)
                    break
                default:
                    return res.status(400).json({ ok: false, error: `type "${action}" tidak valid. Gunakan: home, search, detail, episode, ongoing, completed` })
            }
            res.json({ ok: true, result })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

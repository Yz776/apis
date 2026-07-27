import axios from "axios"
import * as cheerio from "cheerio"

const BASE_URL = "https://anibiplay.net/"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

async function fetchPage(url) {
    const res = await axios.get(url, {
        headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml", "Referer": BASE_URL },
        timeout: 15000
    })
    return res.data
}

function parseInertiaPayload(html) {
    const $ = cheerio.load(html)
    const attr = $("#app").attr("data-page") || $("[data-page]").attr("data-page")
    if (!attr) return null
    try { return JSON.parse(attr) } catch { return null }
}

async function search(query) {
    try {
        const res = await axios.get(`${BASE_URL}api/search`, {
            params: { q: query },
            headers: { "User-Agent": UA, "Referer": BASE_URL, "Accept": "application/json" },
            timeout: 15000
        })
        return res.data || []
    } catch {
        const html = await fetchPage(`${BASE_URL}?s=${encodeURIComponent(query)}`)
        const $ = cheerio.load(html)
        const results = []
        $(".search-result a, .listupd a").each((_, el) => {
            const href = $(el).attr("href") || ""
            const title = $(el).find("h3, h4, .title").text().trim() || $(el).attr("title") || ""
            const img = $(el).find("img").attr("src") || ""
            if (title) results.push({ title, url: href.startsWith("http") ? href : `${BASE_URL}${href}`, image: img })
        })
        return results
    }
}

async function getAnimeDetail(slug) {
    const url = slug.startsWith("http") ? slug : `${BASE_URL}anime/${slug}`
    const html = await fetchPage(url)
    const inertia = parseInertiaPayload(html)

    if (inertia?.props?.anime) {
        return inertia.props.anime
    }

    const $ = cheerio.load(html)
    const title = $("h1").text().trim()
    const image = $(".poster img, .cover img").attr("src") || ""
    const synopsis = $(".synopsis, .description").text().trim()
    const genres = []
    $(".genre a").each((_, el) => genres.push($(el).text().trim()))
    const episodes = []
    $(".episode-list a, .episodes a").each((_, el) => {
        episodes.push({ title: $(el).text().trim(), url: $(el).attr("href") || "" })
    })
    return { title, image, synopsis, genres, episodes }
}

export default {
    route: {
        method: "get",
        path: "/anime/anibiplay",
        auth: false,
        tags: ["Anime"],
        summary: "AnibiPlay — anime scraper",
        description: "Scrape anime data from anibiplay.net. Supports: search, anime detail.",
        parameters: [
            { name: "type", in: "query", required: false, description: "Action: search or detail (default: search)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword (for type=search)", schema: { type: "string" } },
            { name: "slug", in: "query", required: false, description: "Anime slug or URL (for type=detail)", schema: { type: "string" } },
        ],
        responses: {
            "200": { description: "OK" },
            "400": { description: "Bad request" }
        }
    },
    handler: async (req, res) => {
        const { type, query, slug } = req.query
        const action = type || "search"
        try {
            if (action === "search") {
                if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi" })
                const results = await search(query)
                res.json({ ok: true, result: results })
            } else if (action === "detail") {
                if (!slug) return res.status(400).json({ ok: false, error: "slug wajib diisi" })
                const result = await getAnimeDetail(slug)
                res.json({ ok: true, result })
            } else {
                res.status(400).json({ ok: false, error: `type "${action}" tidak valid` })
            }
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

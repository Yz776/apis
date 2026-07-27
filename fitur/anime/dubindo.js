import axios from "axios"
import * as cheerio from "cheerio"

const BASE_URL = "https://www.dubbindo.site/"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

async function fetchPage(url) {
    const res = await axios.get(url, {
        headers: { "User-Agent": UA, "Accept-Language": "id-ID,id;q=0.9", "Referer": BASE_URL },
        timeout: 15000
    })
    return res.data
}

async function search(query) {
    const url = `${BASE_URL}search?keyword=${encodeURIComponent(query)}`
    const html = await fetchPage(url)
    const $ = cheerio.load(html)
    const results = []

    $(".card_search_film a, .search-result a").each((_, el) => {
        const href = $(el).attr("href") || ""
        const fullUrl = href.startsWith("http") ? href : `${BASE_URL.replace(/$/, "")}${href}`
        const title = $(el).find(".title, h3, h4").text().trim() || $(el).text().trim().split("\n")[0]
        const poster = $(el).find("img").attr("src") || ""
        if (title && fullUrl) results.push({ title, url: fullUrl, poster })
    })
    return results
}

async function getDetail(movieUrl) {
    const html = await fetchPage(movieUrl)
    const $ = cheerio.load(html)

    const title = $("title").text().replace("- DubIndo", "").trim() || $("h1").text().trim()
    const poster = $("meta[property='og:image']").attr("content") || $(".poster img").attr("src") || ""
    const synopsis = $("meta[name='description']").attr("content") || $(".synopsis, .desc").text().trim()
    const genres = []
    $(".genre a, .genres a").each((_, el) => genres.push($(el).text().trim()))

    const episodes = []
    $(".episode-list a, .list-episode a").each((_, el) => {
        episodes.push({ title: $(el).text().trim(), url: $(el).attr("href") || "" })
    })

    return { title, poster, synopsis, genres, episodes }
}

export default {
    route: {
        method: "get",
        path: "/anime/dubindo",
        auth: false,
        tags: ["Anime"],
        summary: "DubIndo — drama/anime scraper",
        description: "Scrape anime/drama data from dubbindo.site. Supports: search, detail.",
        parameters: [
            { name: "type", in: "query", required: false, description: "Action: search or detail (default: search)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword (for type=search)", schema: { type: "string" } },
            { name: "url", in: "query", required: false, description: "Movie URL (for type=detail)", schema: { type: "string" } },
        ],
        responses: {
            "200": { description: "OK" },
            "400": { description: "Bad request" }
        }
    },
    handler: async (req, res) => {
        const { type, query, url } = req.query
        const action = type || "search"
        try {
            if (action === "search") {
                if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi" })
                const results = await search(query)
                res.json({ ok: true, result: results })
            } else if (action === "detail") {
                if (!url) return res.status(400).json({ ok: false, error: "url wajib diisi" })
                const result = await getDetail(url)
                res.json({ ok: true, result })
            } else {
                res.status(400).json({ ok: false, error: `type "${action}" tidak valid` })
            }
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

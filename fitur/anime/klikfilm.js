import axios from "axios"
import * as cheerio from "cheerio"

const BASE_URL = "https://klikfilm.com/v4/"
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
        const fullUrl = href.startsWith("http") ? href : `https://klikfilm.com${href}`
        const style = $(el).find(".bscover").attr("style") || ""
        const match = style.match(/url\(['"]?(.*?)['"]?\)/)
        const poster = match ? match[1] : $(el).find("img").attr("src") || ""
        const title = $(el).text().trim().split("\n").map(s => s.trim()).filter(Boolean)[0] || ""
        if (title && fullUrl) results.push({ title, url: fullUrl, poster })
    })
    return results
}

async function getDetail(movieUrl) {
    const html = await fetchPage(movieUrl)
    const $ = cheerio.load(html)
    const title = $("title").text().replace("- KlikFilm", "").trim()
    const synopsis = $("meta[name='description']").attr("content") || ""
    const poster = $("meta[property='og:image']").attr("content") || ""
    const genres = []
    $(".nMenu a, .genre a").each((_, el) => genres.push($(el).text().trim()))
    return { title, synopsis, poster, url: movieUrl, genres }
}

export default {
    route: {
        method: "get",
        path: "/anime/klikfilm",
        auth: false,
        tags: ["Anime"],
        summary: "Klikfilm — movie/film scraper",
        description: "Scrape movie/film data from klikfilm.com. Supports: search, detail.",
        parameters: [
            { name: "type", in: "query", required: false, description: "Action: search or detail (default: search)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword", schema: { type: "string" } },
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

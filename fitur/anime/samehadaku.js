import cloudscraper from "cloudscraper"
import * as cheerio from "cheerio"

const BASE_URL = "https://v2.samehadaku.how/"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

async function fetchPage(url) {
    const res = await cloudscraper.get(url, {
        headers: { "User-Agent": UA, "Accept-Language": "id-ID,id;q=0.9" }
    })
    return res
}

async function search(query) {
    const html = await fetchPage(`${BASE_URL}?s=${encodeURIComponent(query)}`)
    const $ = cheerio.load(html)
    const results = []
    $("article.animpost").each((_, el) => {
        const title = $(el).find(".tt h4").text().trim() || $(el).find("h2").text().trim()
        const url = $(el).find("a").first().attr("href") || ""
        const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || ""
        const type = $(el).find(".type").text().trim()
        const rating = $(el).find(".rating").text().trim()
        if (title && url) results.push({ title, url, image: img, type, rating })
    })
    return results
}

async function getAnimeDetail(animeUrl) {
    const html = await fetchPage(animeUrl.startsWith("http") ? animeUrl : `${BASE_URL}anime/${animeUrl}/`)
    const $ = cheerio.load(html)
    const title = $("h1.entry-title").text().trim()
    const image = $(".thumb img").attr("src") || $(".cat-img img").attr("src") || ""
    const synopsis = $(".entry-content p").text().trim()
    const genres = []
    $(".genre a, .mgen a").each((_, el) => genres.push($(el).text().trim()))

    const info = {}
    $(".spe span, .listinfo span").each((_, el) => {
        const b = $(el).find("b").text().trim()
        const val = $(el).text().replace(b, "").trim()
        if (b) info[b.replace(":", "").trim()] = val
    })

    const episodes = []
    $(".listeps li, #episode-list li").each((_, el) => {
        const epA = $(el).find("a")
        episodes.push({ title: epA.text().trim(), url: epA.attr("href") || "" })
    })
    return { title, image, synopsis, genres, info, episodes }
}

export default {
    route: {
        method: "get",
        path: "/anime/samehadaku",
        auth: false,
        tags: ["Anime"],
        summary: "Samehadaku — anime scraper",
        description: "Scrape anime data from samehadaku. Supports: search, anime detail. Uses cloudscraper to bypass Cloudflare.",
        parameters: [
            { name: "type", in: "query", required: false, description: "Action: search or detail (default: search)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword", schema: { type: "string" } },
            { name: "url", in: "query", required: false, description: "Anime URL or slug (for type=detail)", schema: { type: "string" } },
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
                const result = await getAnimeDetail(url)
                res.json({ ok: true, result })
            } else {
                res.status(400).json({ ok: false, error: `type "${action}" tidak valid` })
            }
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

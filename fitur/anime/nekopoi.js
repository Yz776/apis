import axios from "axios"
import * as cheerio from "cheerio"

const BASE_URL = "https://nekopoi.care"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

async function fetchPage(url) {
    const res = await axios.get(url, {
        headers: {
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
            "Referer": BASE_URL
        },
        timeout: 15000
    })
    return res.data
}

async function search(query, page = 1) {
    const url = page > 1
        ? `${BASE_URL}/search/${encodeURIComponent(query)}/page/${page}/`
        : `${BASE_URL}/search/${encodeURIComponent(query)}`
    try {
        const html = await fetchPage(url)
        const $ = cheerio.load(html)
        const results = []
        $("article, .post-item, .search-item").each((_, el) => {
            const title = $(el).find("h2 a, h3 a, .title a").text().trim() || $(el).find("a").first().text().trim()
            const href = $(el).find("h2 a, h3 a, .title a").attr("href") || $(el).find("a").first().attr("href") || ""
            const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || ""
            if (title && href) results.push({ title, url: href.startsWith("http") ? href : `${BASE_URL}${href}`, image: img })
        })
        // Fallback to WP search
        if (results.length === 0) {
            const html2 = await fetchPage(`${BASE_URL}/?s=${encodeURIComponent(query)}`)
            const $2 = cheerio.load(html2)
            $2("article, .post-item").each((_, el) => {
                const title = $2(el).find("h2 a, h3 a").text().trim()
                const href = $2(el).find("h2 a, h3 a").attr("href") || ""
                const img = $2(el).find("img").attr("src") || ""
                if (title && href) results.push({ title, url: href, image: img })
            })
        }
        return results
    } catch (e) {
        throw new Error(`Pencarian gagal: ${e.message}`)
    }
}

async function getLatest(page = 1) {
    const url = page > 1 ? `${BASE_URL}/page/${page}/` : `${BASE_URL}/`
    const html = await fetchPage(url)
    const $ = cheerio.load(html)
    const results = []
    $("article, .post-item").each((_, el) => {
        const title = $(el).find("h2 a, h3 a").text().trim()
        const href = $(el).find("h2 a, h3 a").attr("href") || ""
        const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || ""
        if (title && href) results.push({ title, url: href, image: img })
    })
    return results
}

async function getDetail(urlOrSlug) {
    const url = urlOrSlug.startsWith("http") ? urlOrSlug : `${BASE_URL}/${urlOrSlug}/`
    const html = await fetchPage(url)
    const $ = cheerio.load(html)
    const title = $("h1, h2.entry-title").first().text().trim()
    const image = $(".thumb img, .post-thumbnail img").attr("src") || $("meta[property='og:image']").attr("content") || ""
    const synopsis = $(".entry-content p, .sinopsis").text().trim()

    const genres = []
    $(".genre a, .mgen a, .tagcloud a").each((_, el) => genres.push($(el).text().trim()))

    const info = {}
    $(".spe span, .info span").each((_, el) => {
        const key = $(el).find("b, strong").text().trim().replace(":", "")
        const val = $(el).text().replace($(el).find("b, strong").text(), "").trim()
        if (key) info[key] = val
    })

    const downloads = []
    $(".download a, .link-download a").each((_, el) => {
        downloads.push({ name: $(el).text().trim(), url: $(el).attr("href") || "" })
    })

    const streams = []
    $(".player iframe, .stream iframe").each((_, el) => {
        const src = $(el).attr("src") || ""
        if (src) streams.push(src)
    })

    return { title, image, synopsis, genres, info, downloads, streams }
}

export default {
    route: {
        method: "get",
        path: "/anime/nekopoi",
        auth: false,
        tags: ["Anime"],
        summary: "Nekopoi — anime/hentai scraper",
        description: "Scrape anime data from nekopoi.care. Supports: search, latest, detail.",
        parameters: [
            { name: "type", in: "query", required: false, description: "Action: search, latest, detail (default: search)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword (for type=search)", schema: { type: "string" } },
            { name: "url", in: "query", required: false, description: "Anime URL or slug (for type=detail)", schema: { type: "string" } },
            { name: "page", in: "query", required: false, description: "Page number (for type=latest)", schema: { type: "integer", default: 1 } },
        ],
        responses: {
            "200": { description: "OK" },
            "400": { description: "Bad request" }
        }
    },
    handler: async (req, res) => {
        const { type, query, url, page } = req.query
        const action = type || "search"
        try {
            if (action === "search") {
                if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi" })
                const results = await search(query, parseInt(page) || 1)
                res.json({ ok: true, result: results })
            } else if (action === "latest") {
                const results = await getLatest(parseInt(page) || 1)
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

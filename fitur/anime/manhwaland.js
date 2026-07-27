import axios from "axios"
import * as cheerio from "cheerio"

let BASE_URL = "https://05c.manhwaland.land/"

function getAbsoluteUrl(pathOrUrl) {
    if (!pathOrUrl) return ""
    if (pathOrUrl.startsWith("http")) return pathOrUrl
    if (pathOrUrl.startsWith("/")) return `${BASE_URL.replace(/$/, "")}${pathOrUrl}`
    return `${BASE_URL.replace(/$/, "")}/${pathOrUrl}`
}

async function fetchPage(url) {
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        "Referer": BASE_URL
    }
    const res = await axios.get(url, { headers, timeout: 15000 })
    return res.data
}

function parseMangaCard($, el) {
    const card = $(el)
    let href = ""
    if (card.prop("tagName").toLowerCase() === "a") {
        href = card.attr("href") || ""
    } else {
        href = card.find("a[href^='/manga/']").first().attr("href") || ""
    }
    const title = card.find(".manga-title").text().trim() || card.find("h3").text().trim() || card.find("img").attr("alt")?.trim() || ""
    const image = card.find("img").attr("src") || ""
    const type = card.find(".manga-badge").text().trim() || card.find(".text-white\/80").text().trim() || ""
    let rating = card.find(".text-amber-400").text().trim().replace("\u2605", "").trim()
    if (!rating) {
        const match = card.text().match(/\u2605\s*([\d.A-Za-z/]+)/)
        if (match) rating = match[1].trim()
    }
    return { title, slug: href.replace(/^\/manga\//, ""), url: href ? getAbsoluteUrl(href) : "", image, type, rating: rating || "N/A" }
}

async function search(query) {
    const url = `${BASE_URL}?s=${encodeURIComponent(query)}`
    const html = await fetchPage(url)
    const $ = cheerio.load(html)
    const results = []
    $(".manga-card, .listupd .bs, .listupd .bsx").each((_, el) => {
        results.push(parseMangaCard($, el))
    })
    return results.filter(r => r.title)
}

async function getMangaDetails(urlOrSlug) {
    const url = urlOrSlug.startsWith("http") ? urlOrSlug : `${BASE_URL}manga/${urlOrSlug}/`
    const html = await fetchPage(url)
    const $ = cheerio.load(html)

    const title = $("h1.entry-title, h1").first().text().trim()
    const image = $(".thumb img, .wp-post-image").attr("src") || ""
    const synopsis = $(".entry-content, .sinopsis, .sin p").text().trim()

    const genres = []
    $(".mgen a, .wd-full span.mgen a").each((_, el) => genres.push($(el).text().trim()))

    const meta = {}
    $(".spe span, .tsinfo .imptdt").each((_, el) => {
        const b = $(el).find("b, i").text().trim()
        const val = $(el).text().replace(b, "").trim()
        if (b) meta[b.toLowerCase().replace(/[^a-z0-9]/g, "_")] = val
    })

    const chapters = []
    $("#chapterlist ul li, .eplister li").each((_, el) => {
        const chA = $(el).find("a").first()
        chapters.push({
            title: chA.text().trim(),
            url: chA.attr("href") || "",
            date: $(el).find(".chapterdate").text().trim()
        })
    })

    return { title, image, synopsis, genres, meta, chapters, total_chapters: chapters.length }
}

async function getChapterPages(urlOrSlug) {
    const url = urlOrSlug.startsWith("http") ? urlOrSlug : `${BASE_URL}${urlOrSlug}`
    const html = await fetchPage(url)
    const $ = cheerio.load(html)
    const images = []
    $("#readerarea img, .entry-content img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || ""
        if (src && !src.includes("lazy") && !src.includes("banner")) images.push(src)
    })
    return images
}

export default {
    route: {
        method: "get",
        path: "/anime/manhwaland",
        auth: false,
        tags: ["Anime"],
        summary: "Manhwaland — manhwa/manga scraper",
        description: "Scrape manhwa/manga data from manhwaland.land. Supports: search, detail, chapter pages.",
        parameters: [
            { name: "type", in: "query", required: false, description: "Action: search, detail, chapter (default: search)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword (for type=search)", schema: { type: "string" } },
            { name: "url", in: "query", required: false, description: "Manga URL or slug (for type=detail/chapter)", schema: { type: "string" } },
        ],
        responses: {
            "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, result: { type: "object" } } } } } },
            "400": { description: "Bad request", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } } }
        }
    },
    handler: async (req, res) => {
        const { type, query, url } = req.query
        const action = type || "search"
        try {
            if (action === "search") {
                if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi untuk search" })
                const results = await search(query)
                res.json({ ok: true, type: "search", result: results })
            } else if (action === "detail") {
                if (!url) return res.status(400).json({ ok: false, error: "url wajib diisi untuk detail" })
                const result = await getMangaDetails(url)
                res.json({ ok: true, type: "detail", result })
            } else if (action === "chapter") {
                if (!url) return res.status(400).json({ ok: false, error: "url wajib diisi untuk chapter" })
                const result = await getChapterPages(url)
                res.json({ ok: true, type: "chapter", result })
            } else {
                res.status(400).json({ ok: false, error: `type "${action}" tidak valid. Gunakan: search, detail, chapter` })
            }
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

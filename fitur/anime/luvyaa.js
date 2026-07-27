import axios from "axios"
import * as cheerio from "cheerio"

const BASE_URL = "https://v4.luvyaa.co/"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

async function fetchPage(url) {
    const res = await axios.get(url, {
        headers: { "User-Agent": UA, "Accept-Language": "id-ID,id;q=0.9", "Referer": BASE_URL },
        timeout: 15000
    })
    return res.data
}

async function search(query) {
    const html = await fetchPage(`${BASE_URL}?s=${encodeURIComponent(query)}`)
    const $ = cheerio.load(html)
    const results = []
    $(".listupd .bs, .listupd .bsx").each((_, el) => {
        const a = $(el).find("a")
        const title = a.attr("title") || $(el).find(".tt").text().trim()
        const url = a.attr("href") || ""
        const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || ""
        const type = $(el).find(".limit .type").text().trim()
        if (title && url) results.push({ title, url, image: img, type })
    })
    return results
}

async function getComicInfo(comicUrl) {
    const html = await fetchPage(comicUrl)
    const $ = cheerio.load(html)
    const title = $("h1.entry-title").text().trim()
    const thumb = $(".thumb img").attr("src") || $(".thumb img").attr("data-src") || ""
    const synopsis = $(".entry-content p, .sinopsis p, .sin p").text().trim()
    const genres = []
    $(".mgen a").each((_, el) => genres.push($(el).text().trim()))

    const meta = {}
    $(".spe span").each((_, el) => {
        const bTag = $(el).find("b")
        const bText = bTag.text().trim().toLowerCase()
        const val = $(el).text().replace(bTag.text(), "").trim()
        if (bText) meta[bText] = val
    })

    const chapters = []
    $("#chapterlist ul li").each((_, el) => {
        const chA = $(el).find("a").first()
        chapters.push({
            title: chA.text().trim().replace(/\n|\t/g, ""),
            url: chA.attr("href") || "",
            date: $(el).find(".chapterdate").text().trim()
        })
    })
    return { title, url: comicUrl, thumbnail: thumb, synopsis, genres, meta, chapters }
}

async function getChapterImages(chapterUrl) {
    const html = await fetchPage(chapterUrl)
    const $ = cheerio.load(html)
    const images = []
    $("#readerarea img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || ""
        if (src && !src.includes("lazy") && !src.includes("banner")) images.push(src)
    })
    return images
}

export default {
    route: {
        method: "get",
        path: "/anime/luvyaa",
        auth: false,
        tags: ["Anime"],
        summary: "Luvyaa — manga/comic scraper",
        description: "Scrape manga/comic data from luvyaa.co. Supports: search, comic detail, chapter images.",
        parameters: [
            { name: "type", in: "query", required: false, description: "Action: search, detail, chapter (default: search)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword", schema: { type: "string" } },
            { name: "url", in: "query", required: false, description: "Comic/chapter URL (for type=detail/chapter)", schema: { type: "string" } },
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
                const result = await getComicInfo(url)
                res.json({ ok: true, result })
            } else if (action === "chapter") {
                if (!url) return res.status(400).json({ ok: false, error: "url wajib diisi" })
                const result = await getChapterImages(url)
                res.json({ ok: true, result })
            } else {
                res.status(400).json({ ok: false, error: `type "${action}" tidak valid` })
            }
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

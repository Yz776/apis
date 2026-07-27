import * as cheerio from "cheerio"

const BASE_URL = "https://seegore.com"

async function getHtml(url) {
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": `${BASE_URL}/gore/`
    }
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) })
    if (res.ok) return await res.text()
    return null
}

function parseCard($, el) {
    const article = $(el)
    let url = "", title = ""
    const mediaLink = article.find("a.mm-card__media")
    const titleLink = article.find("h2.mm-card__title")
    if (mediaLink.length) { url = mediaLink.attr("href") || ""; title = mediaLink.attr("aria-label") || "" }
    if (titleLink.length) { const a = titleLink.find("a"); if (a.length) { if (!url) url = a.attr("href") || ""; if (!title) title = a.attr("title") || a.text().trim() } }
    const img = article.find("img")
    const thumbnail = img.attr("src") || ""
    const badge = article.find("a.mm-card__badge")
    const category = badge.text().trim()
    const category_url = badge.attr("href") || ""
    const statsSpan = article.find("span.mm-card__stats")
    const viewsSpan = statsSpan.find("span[title='Views']")
    const views = viewsSpan.find("strong").text().trim() || viewsSpan.text().trim()
    const upvotesSpan = statsSpan.find("span[title='Upvotes']")
    const upvotes = upvotesSpan.find("strong").text().trim() || upvotesSpan.text().trim()
    const dateEl = article.find("time.mm-card__date")
    const date = dateEl.text().trim()
    const datetime = dateEl.attr("datetime") || ""
    let slug = ""
    try { slug = new URL(url).pathname.split("/").filter(Boolean).pop() || "" } catch { slug = "" }
    return { title, url, slug, thumbnail, category, category_url, views, upvotes, date, datetime }
}

async function getLatest(page = 1) {
    const url = page <= 1 ? `${BASE_URL}/gore/` : `${BASE_URL}/gore/page/${page}/`
    const html = await getHtml(url)
    if (!html) return []
    const $ = cheerio.load(html)
    const results = []
    $("article.mm-card").each((_, el) => results.push(parseCard($, el)))
    return results
}

async function searchVideos(query) {
    const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`
    const html = await getHtml(url)
    if (!html) return []
    const $ = cheerio.load(html)
    const results = []
    $("article.mm-card").each((_, el) => results.push(parseCard($, el)))
    return results
}

async function getVideoDetail(urlOrSlug) {
    const url = urlOrSlug.startsWith("http") ? urlOrSlug : `${BASE_URL}/${urlOrSlug}/`
    const html = await getHtml(url)
    if (!html) return null
    const $ = cheerio.load(html)
    const article = $("article")
    const detail = { url, title: "", category: "", views: "", upvotes: "", description: "", videos: [], tags: [] }
    const h1 = article.find("h1, header h1")
    detail.title = h1.text().trim()
    const badge = article.find("a.mm-card__badge")
    detail.category = badge.text().trim()
    const metaDiv = article.find("div.mm-single-summary")
    metaDiv.find("span.mm-single-summary__item").each((_, s) => {
        const t = $(s).attr("title") || ""
        const v = $(s).find("strong").text().trim() || $(s).text().trim()
        if (t.toLowerCase().includes("views")) detail.views = v
        else if (t.toLowerCase().includes("upvotes")) detail.upvotes = v
    })
    const contentDiv = article.find("div.mm-single__content")
    contentDiv.find("video source, video").each((idx, v) => {
        const src = $(v).attr("src") || $(v).find("source").attr("src") || ""
        if (src) detail.videos.push({ index: idx + 1, src: src.split("?")[0], poster: $(v).attr("poster") || "" })
    })
    if (detail.videos.length === 0) {
        contentDiv.find("a").each((idx, a) => {
            const href = $(a).attr("href") || ""
            if (href.split("?")[0].endsWith(".mp4")) detail.videos.push({ index: idx + 1, src: href.split("?")[0], poster: "" })
        })
    }
    const paragraphs = []
    contentDiv.find("p").each((_, p) => { if (!$(p).find("video").length && $(p).text().trim()) paragraphs.push($(p).text().trim()) })
    detail.description = paragraphs.join("\n\n")
    const tagsNav = article.find("nav.mm-post-tags")
    tagsNav.find("li a").each((_, a) => detail.tags.push({ name: $(a).text().trim(), url: $(a).attr("href") || "" }))
    return detail
}

export default {
    route: {
        method: "get",
        path: "/anime/seegore",
        auth: false,
        tags: ["Anime"],
        summary: "SeeGore — video scraper",
        description: "Scrape video data from seegore.com. Supports: latest, search, detail.",
        parameters: [
            { name: "type", in: "query", required: false, description: "Action: latest, search, detail (default: latest)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword (for type=search)", schema: { type: "string" } },
            { name: "url", in: "query", required: false, description: "Video URL or slug (for type=detail)", schema: { type: "string" } },
            { name: "page", in: "query", required: false, description: "Page number (for type=latest)", schema: { type: "integer", default: 1 } },
        ],
        responses: {
            "200": { description: "OK" },
            "400": { description: "Bad request" }
        }
    },
    handler: async (req, res) => {
        const { type, query, url, page } = req.query
        const action = type || "latest"
        try {
            if (action === "latest") {
                const results = await getLatest(parseInt(page) || 1)
                res.json({ ok: true, result: results })
            } else if (action === "search") {
                if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi" })
                const results = await searchVideos(query)
                res.json({ ok: true, result: results })
            } else if (action === "detail") {
                if (!url) return res.status(400).json({ ok: false, error: "url wajib diisi" })
                const result = await getVideoDetail(url)
                res.json({ ok: true, result })
            } else {
                res.status(400).json({ ok: false, error: `type "${action}" tidak valid` })
            }
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

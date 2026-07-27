import * as cheerio from "cheerio"
import axios from "axios"

const BASE_URL = "https://donghub.vip"
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
}

function getSlug(urlStr) {
    if (!urlStr) return ""
    try {
        const url = new URL(urlStr)
        const pathname = url.pathname.replace(/\/+$/, "").replace(/^\/+/, "")
        const parts = pathname.split("/")
        return parts[parts.length - 1] || ""
    } catch (e) {
        const pathname = urlStr.split("?")[0].replace(/\/+$/, "").replace(/^\/+/, "")
        const parts = pathname.split("/")
        return parts[parts.length - 1] || ""
    }
}

async function fetchHtml(url) {
    const res = await axios.get(url, { headers: HEADERS })
    return res.data
}

async function getHome() {
    const html = await fetchHtml(`${BASE_URL}/`)
    const $ = cheerio.load(html)

    const recommendations = []
    $("#slidertwo .swiper-slide.item").each((i, el) => {
        const backdropStyle = $(el).find(".backdrop").attr("style") || ""
        const coverMatch = backdropStyle.match(/url\(['"]?([^'"]+)['"]?\)/)
        const cover = coverMatch ? coverMatch[1] : ""
        const titleLink = $(el).find("h2 a")
        const title = titleLink.text().trim()
        const link = titleLink.attr("href") || ""
        const synopsis = $(el).find(".info p").text().trim()
        recommendations.push({ title, link, slug: getSlug(link), cover, synopsis })
    })

    const popularToday = []
    $(".listupd.popularslider article.bs").each((i, el) => {
        const a = $(el).find(".bsx a")
        const link = a.attr("href") || ""
        const titleAttr = a.attr("title") || ""
        const cover = a.find("img").attr("src") || a.find("img").attr("data-src") || ""
        const episode = a.find(".limit .bt .epx").text().trim()
        const subStatus = a.find(".limit .bt .sb").text().trim()
        const type = a.find(".limit .typez").text().trim()
        const status = a.find(".limit .status").text().trim()
        const hot = a.find(".limit .hotbadge").length > 0
        const tt = a.find(".tt")
        const seriesTitle = tt.clone().children().remove().end().text().trim()
        const episodeTitle = tt.find("h2").text().trim()
        popularToday.push({
            title: episodeTitle || titleAttr,
            seriesTitle: seriesTitle || titleAttr.replace(/\sEpisode\s\d+.*/i, ""),
            link, slug: getSlug(link), cover, episode, subStatus, type, status, hot
        })
    })

    const latestRelease = []
    $(".releases.latesthome").next(".listupd").find("article.bs").each((i, el) => {
        const a = $(el).find(".bsx a")
        const link = a.attr("href") || ""
        const titleAttr = a.attr("title") || ""
        const cover = a.find("img").attr("src") || a.find("img").attr("data-src") || ""
        const episode = a.find(".limit .bt .epx").text().trim()
        const subStatus = a.find(".limit .bt .sb").text().trim()
        const type = a.find(".limit .typez").text().trim()
        const status = a.find(".limit .status").text().trim()
        const hot = a.find(".limit .hotbadge").length > 0
        const tt = a.find(".tt")
        const seriesTitle = tt.clone().children().remove().end().text().trim()
        const episodeTitle = tt.find("h2").text().trim()
        latestRelease.push({
            title: episodeTitle || titleAttr,
            seriesTitle: seriesTitle || titleAttr.replace(/\sEpisode\s\d+.*/i, ""),
            link, slug: getSlug(link), cover, episode, subStatus, type, status, hot
        })
    })

    const donghuaBaru = []
    $(".ongoingseries").find("ul li").each((i, el) => {
        const a = $(el).find("a")
        const link = a.attr("href") || ""
        const title = a.find(".l").text().trim()
        const episode = a.find(".r").text().trim()
        donghuaBaru.push({ title, link, slug: getSlug(link), episode })
    })

    const parsePopularList = (selector) => {
        const items = []
        $(selector).find("ul li").each((i, el) => {
            const rank = $(el).find(".ctr").text().trim()
            const a = $(el).find(".leftseries h4 a")
            const title = a.text().trim()
            const link = a.attr("href") || ""
            const cover = $(el).find(".imgseries img").attr("src") || $(el).find(".imgseries img").attr("data-src") || ""
            const genresList = []
            $(el).find(".leftseries span a").each((j, genreEl) => {
                genresList.push({
                    name: $(genreEl).text().trim(),
                    link: $(genreEl).attr("href") || "",
                    slug: getSlug($(genreEl).attr("href"))
                })
            })
            const rating = $(el).find(".leftseries .rt .numscore").text().trim()
            items.push({ rank: parseInt(rank) || i + 1, title, link, slug: getSlug(link), cover, genres: genresList, rating })
        })
        return items
    }

    const donghuaPopular = {
        weekly: parsePopularList(".wpop-weekly"),
        monthly: parsePopularList(".wpop-monthly"),
        allTime: parsePopularList(".wpop-alltime")
    }

    const genres = []
    $("ul.genre li a").each((i, el) => {
        const name = $(el).text().trim()
        const link = $(el).attr("href") || ""
        genres.push({ name, link, slug: getSlug(link) })
    })

    return {
        recommendations,
        popularToday,
        latestRelease,
        donghuaBaru,
        donghuaPopular,
        genres
    }
}

async function searchDonghua(query, page = 1) {
    const url = page > 1
        ? `${BASE_URL}/page/${page}/?s=${encodeURIComponent(query)}`
        : `${BASE_URL}/?s=${encodeURIComponent(query)}`
    const html = await fetchHtml(url)
    const $ = cheerio.load(html)

    const results = []
    $(".listupd article.bs").each((i, el) => {
        const a = $(el).find(".bsx a")
        const link = a.attr("href") || ""
        const title = a.attr("title") || ""
        const cover = a.find("img").attr("src") || a.find("img").attr("data-src") || ""
        const type = a.find(".limit .typez").text().trim()
        const status = a.find(".limit .status").text().trim()
        const episode = a.find(".limit .bt .epx").text().trim()
        const subStatus = a.find(".limit .bt .sb").text().trim()
        results.push({ title, link, slug: getSlug(link), cover, type, status, episode, subStatus })
    })

    let currentPage = page
    let totalPages = page
    const currentText = $(".pagination span.page-numbers.current").text().trim()
    if (currentText) currentPage = parseInt(currentText) || page
    $(".pagination a.page-numbers").each((i, el) => {
        const num = parseInt($(el).text().trim())
        if (num && num > totalPages) totalPages = num
    })
    if (currentPage > totalPages) totalPages = currentPage

    return {
        results,
        pagination: { currentPage, totalPages, hasNextPage: currentPage < totalPages }
    }
}

async function getDetail(slugOrUrl) {
    let url = slugOrUrl
    if (!url.startsWith("http")) url = `${BASE_URL}/${slugOrUrl}/`
    const html = await fetchHtml(url)
    const $ = cheerio.load(html)

    const title = $(".entry-title").text().trim()
    const cover = $(".thumb img").attr("src") || $(".thumb img").attr("data-src") || ""
    const synopsis = $(".bixbox.synp .entry-content").text().trim()

    const metadata = {}
    $(".info-content .spe span").each((i, el) => {
        const text = $(el).text()
        const parts = text.split(":")
        if (parts.length >= 2) {
            const key = parts[0].trim()
            const val = parts.slice(1).join(":").trim()
            metadata[key] = val
        }
    })

    const genres = []
    $(".genxed a").each((i, el) => {
        genres.push({ name: $(el).text().trim(), link: $(el).attr("href") || "", slug: getSlug($(el).attr("href")) })
    })

    const episodes = []
    $(".eplister ul li").each((i, el) => {
        const a = $(el).find("a")
        const link = a.attr("href") || ""
        const num = $(el).find(".epl-num").text().trim()
        const epTitle = $(el).find(".epl-title").text().trim()
        const subStatus = $(el).find(".epl-sub .status").text().trim()
        const date = $(el).find(".epl-date").text().trim()
        episodes.push({ title: epTitle, link, slug: getSlug(link), episodeNumber: num, date, subStatus })
    })

    const recommended = []
    $(".releases:contains(\"Recommended Series\")").next(".listupd").find("article.bs").each((i, el) => {
        const a = $(el).find(".bsx a")
        const rUrl = a.attr("href") || ""
        const rTitle = a.attr("title") || ""
        const rCover = a.find("img").attr("src") || a.find("img").attr("data-src") || ""
        const status = a.find(".limit .status").text().trim()
        const type = a.find(".limit .typez").text().trim()
        const episodeLabel = a.find(".limit .bt .epx").text().trim()
        const subStatus = a.find(".limit .bt .sb").text().trim()
        recommended.push({ title: rTitle, link: rUrl, slug: getSlug(rUrl), cover: rCover, status, type, episodeLabel, subStatus })
    })

    return { title, cover, synopsis, metadata, genres, episodes, recommended }
}

export default {
    route: {
        method: "get",
        path: "/anime/donghub",
        auth: false,
        tags: ["Anime"],
        summary: "Search donghua via Donghub",
        description: "Browse donghua homepage, search by keyword, or get detailed info including episodes, metadata, and recommendations from Donghub",
        parameters: [
            { name: "type", in: "query", required: false, description: "Action type: home, search, detail (default: home)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword (for search)", schema: { type: "string" } },
            { name: "slug", in: "query", required: false, description: "Donghua slug for detail page", schema: { type: "string" } },
            { name: "page", in: "query", required: false, description: "Page number for search (default: 1)", schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, result: { type: "object" } } } } } } }
    },
    handler: async (req, res) => {
        const { type, query, slug, page } = req.query
        const action = type || "home"

        try {
            if (action === "home") {
                const result = await getHome()
                return res.json({ ok: true, result })
            }

            if (action === "search") {
                if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi untuk search" })
                const result = await searchDonghua(query, parseInt(page) || 1)
                return res.json({ ok: true, result })
            }

            if (action === "detail") {
                if (!slug) return res.status(400).json({ ok: false, error: "slug wajib diisi untuk detail" })
                const result = await getDetail(slug)
                return res.json({ ok: true, result })
            }

            return res.status(400).json({ ok: false, error: `type "${action}" tidak valid. Gunakan: home, search, detail` })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

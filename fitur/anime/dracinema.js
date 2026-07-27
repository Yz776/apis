import * as cheerio from "cheerio"
import axios from "axios"

const BASE_URL = "https://dracinema.com"
const API_KEY = "xb3MdwdLrZrpaDXvrLLwfP=="

const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://dracinema.com/",
    "X-API-Key": API_KEY,
    "Accept": "application/json, text/plain, */*"
}

const HTML_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5"
}

let genreSlugToNameMap = {}

function slugify(text) {
    if (!text) return ""
    return text
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
}

function cleanTitle(title) {
    if (!title) return ""
    return title
        .replace(/\s+Full\s+Episode\s+Subtitle\s+Indonesia\s+-\s+Dracinema/gi, "")
        .replace(/\s+Sub\s+Indo\s+-\s+Dracinema/gi, "")
        .replace(/\s+-\s+Dracinema/gi, "")
        .trim()
}

function parseMovieSlug(moviePath) {
    const cleanPath = moviePath.replace("/movie/", "").replace("/", "")
    const lastHyphen = cleanPath.lastIndexOf("-")
    if (lastHyphen !== -1) {
        return {
            slug: cleanPath.substring(0, lastHyphen),
            id: cleanPath.substring(lastHyphen + 1)
        }
    }
    return { slug: cleanPath, id: "" }
}

async function fetchPage(url) {
    const res = await axios.get(url, { headers: HTML_HEADERS })
    return res.data
}

async function fetchApi(url) {
    const res = await axios.get(url, { headers: DEFAULT_HEADERS })
    return res.data
}

async function searchMovies(keyword) {
    const url = `${BASE_URL}/api/search?keyword=${encodeURIComponent(keyword)}`
    const response = await fetchApi(url)
    const data = response.data || []

    return data.map(item => {
        const originalName = item.bookName || ""
        const slug = slugify(originalName)
        const id = item.originalBookId || item.id || ""
        return {
            id,
            name: originalName,
            cover: item.cover || "",
            introduction: item.introduction || "",
            episodesCount: item.chapterCount || 0,
            url: `/movie/${slug}-${id}`,
            slug
        }
    })
}

async function getMovieDetails(movieSlugOrPath) {
    const cleanPath = movieSlugOrPath.startsWith("/movie/") ? movieSlugOrPath : `/movie/${movieSlugOrPath}`
    const url = `${BASE_URL}${cleanPath}`
    const html = await fetchPage(url)
    const $ = cheerio.load(html)

    const title = cleanTitle($("h1").filter((i, el) => $(el).text().trim() !== "Dracinema").first().text().trim())

    let synopsis = $("p[itemprop=\"description\"]").text().trim()
    if (!synopsis) {
        const sinopsisHeading = $("h2").filter((i, el) => $(el).text().trim() === "Sinopsis")
        if (sinopsisHeading.length) {
            let sibling = sinopsisHeading.next()
            while (sibling.length && sibling[0].name !== "h2") {
                const text = sibling.text().trim()
                if (text && text.length > synopsis.length) {
                    synopsis = text
                }
                sibling = sibling.next()
            }
        }
    }

    const genres = []
    $("a[href^=\"/genre/\"]").each((i, el) => {
        const name = $(el).text().trim()
        const href = $(el).attr("href")
        const slug = href.replace("/genre/", "")
        if (slug && !genres.some(g => g.slug === slug)) {
            genres.push({ name, slug, url: href })
        }
    })

    const recommendations = []
    $("h2").each((i, el) => {
        const headingText = $(el).text().trim()
        const exclude = ["Sinopsis", "Daftar Episode", "Pertanyaan Umum"]
        if (exclude.some(ex => headingText.includes(ex))) return

        const row = { sectionTitle: headingText, movies: [] }
        const parent = $(el).parent()
        parent.find("a[href^=\"/movie/\"]").each((j, linkEl) => {
            const href = $(linkEl).attr("href")
            const img = $(linkEl).find("img")
            const movieTitle = cleanTitle(img.attr("alt") || "")
            const cover = img.attr("src") || img.attr("data-src") || ""
            const { slug, id } = parseMovieSlug(href)
            if (!row.movies.some(m => m.id === id)) {
                row.movies.push({ title: movieTitle, cover, url: href, slug, id })
            }
        })
        if (row.movies.length > 0) recommendations.push(row)
    })

    const episodes = []
    $("a[href*=\"/play/\"]").each((i, el) => {
        const href = $(el).attr("href")
        const text = $(el).text().trim()
        const parts = href.split("/")
        const epsNumStr = parts[parts.length - 1]
        const epsNum = parseInt(epsNumStr, 10)

        if (!isNaN(epsNum)) {
            episodes.push({ title: `Episode ${epsNum}`, url: href, number: epsNum })
        } else {
            episodes.push({ title: text || "Putar Sekarang", url: href, number: 1 })
        }
    })

    episodes.sort((a, b) => a.number - b.number)
    const uniqueEpisodes = []
    const seenEps = new Set()
    for (const ep of episodes) {
        if (!seenEps.has(ep.number)) {
            seenEps.add(ep.number)
            uniqueEpisodes.push(ep)
        }
    }

    const { slug, id } = parseMovieSlug(cleanPath)

    return {
        title,
        slug,
        id,
        synopsis,
        genres,
        episodes: uniqueEpisodes,
        recommendations
    }
}

export default {
    route: {
        method: "get",
        path: "/anime/dracinema",
        auth: false,
        tags: ["Anime"],
        summary: "Search movies via Dracinema",
        description: "Search Chinese dramas/kmovies on Dracinema or get detailed info including synopsis, genres, episodes, and recommendations",
        parameters: [
            { name: "type", in: "query", required: false, description: "Action type: search or detail (default: search)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword (required for search)", schema: { type: "string" } },
            { name: "slug", in: "query", required: false, description: "Movie slug or path (required for detail, e.g. mahkota-cahaya-untuk-istri-apollo-ns_2064962492755087362)", schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, result: { type: "object" } } } } } } }
    },
    handler: async (req, res) => {
        const { type, query, slug } = req.query
        const action = type || "search"

        try {
            if (action === "search") {
                if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi untuk search" })
                const result = await searchMovies(query)
                return res.json({ ok: true, result })
            }

            if (action === "detail") {
                if (!slug) return res.status(400).json({ ok: false, error: "slug wajib diisi untuk detail" })
                const result = await getMovieDetails(slug)
                return res.json({ ok: true, result })
            }

            return res.status(400).json({ ok: false, error: `type "${action}" tidak valid. Gunakan: search, detail` })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

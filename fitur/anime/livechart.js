import axios from "axios"
import * as cheerio from "cheerio"

const BASE_URL = "https://www.livechart.me"

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/"
}

async function fetchPage(url, params = {}) {
    const response = await axios.get(url, {
        headers: HEADERS,
        params,
        timeout: 15000
    })
    return response.data
}

function parseAnimeCard($, el) {
    const id = $(el).attr("data-anime-id")
    const romaji = $(el).attr("data-romaji") || ""
    const english = $(el).attr("data-english") || ""
    const native = $(el).attr("data-native") || ""

    let alternateTitles = []
    try {
        alternateTitles = JSON.parse($(el).attr("data-alternate") || "[]")
    } catch (e) {}

    const premiere = $(el).attr("data-premiere") ? parseInt($(el).attr("data-premiere")) : null

    const genres = []
    $(el).find(".anime-tags li a").each((_, a) => {
        genres.push($(a).text().trim())
    })

    const img = $(el).find(".poster-container img")
    const poster = img.attr("src") || ""
    const posterLarge = img.attr("srcset") ? img.attr("srcset").split(",").pop().trim().split(" ")[0] : poster

    const countdownEl = $(el).find(".episode-countdown")
    let nextEpisode = null
    if (countdownEl.length > 0) {
        const epText = $(el).find(".release-schedule-info").text().trim()
        const timestamp = $(el).find(".episode-countdown time").attr("data-timestamp")
        nextEpisode = {
            numberText: epText,
            timestamp: timestamp ? parseInt(timestamp) : null
        }
    }

    const rating = $(el).find(".anime-avg-user-rating").text().trim() || null

    const studios = []
    $(el).find(".anime-studios li a").each((_, a) => {
        studios.push($(a).text().trim())
    })

    const startDate = $(el).find(".anime-date a").text().trim() || null
    const source = $(el).find(".anime-source").text().trim() || null
    const episodesText = $(el).find(".anime-episodes").text().trim() || null

    const synopsis = $(el).find(".anime-synopsis p").not(".lc-editor-note").text().trim() || null

    const externalLinks = {}
    $(el).find(".related-links .icon-buttons-set a").each((_, a) => {
        const href = $(a).attr("href")
        if (!href) return
        const cls = $(a).attr("class") || ""
        const key = cls.replace("-icon", "").trim()
        externalLinks[key] = href.startsWith("/") ? `${BASE_URL}${href}` : href
    })

    return {
        id,
        title: romaji || english || native,
        romaji,
        english,
        native,
        alternateTitles,
        premiere,
        genres,
        poster: posterLarge,
        posterSmall: poster,
        nextEpisode,
        rating,
        studios,
        startDate,
        source,
        episodesText,
        synopsis,
        externalLinks
    }
}

async function livechartSearch(query) {
    const url = `${BASE_URL}/search`
    const html = await fetchPage(url, { q: query })
    const $ = cheerio.load(html)

    const results = []
    $(".anime-item").each((_, el) => {
        const id = $(el).attr("data-anime-id")
        const premiere = $(el).attr("data-premiere") ? parseInt($(el).attr("data-premiere")) : null
        const title = $(el).attr("data-title") || ""

        const img = $(el).find(".anime-item__poster-wrap img")
        const poster = img.attr("src") || ""
        const posterLarge = img.attr("srcset") ? img.attr("srcset").split(",").pop().trim().split(" ")[0] : poster

        const typeText = $(el).find(".title-extra").text().trim() || ""
        const date = $(el).find(".info span").first().text().trim() || ""
        const rating = $(el).find(".fake-link").text().trim() || ""
        const link = $(el).find(".anime-item__body__title a").attr("href") || ""

        results.push({
            id,
            title,
            premiere,
            poster: posterLarge,
            typeText,
            date,
            rating,
            link: link ? `${BASE_URL}${link}` : ""
        })
    })

    return { query, total: results.length, results }
}

async function livechartDetail(slug) {
    // Accept either a numeric ID or a slug string
    const url = `${BASE_URL}/anime/${slug}`
    const html = await fetchPage(url)
    const $ = cheerio.load(html)

    const jsonLdText = $("script[type='application/ld+json']").html()
    let schema = {}
    try {
        schema = JSON.parse(jsonLdText || "{}")
    } catch (e) {}

    let status = null
    $(".lc-poster-col div.text-sm").each((_, el) => {
        const label = $(el).find(".font-medium, .text-sm.font-medium").text().trim()
        if (label === "Status") {
            status = $(el).clone().children().remove().end().text().trim()
        }
    })

    const hashtags = []
    $(".lc-poster-col a[href*='x.com/search']").each((_, a) => {
        hashtags.push($(a).text().trim())
    })

    const countdownEl = $(".lc-anime-countdown-grid")
    let nextEpisode = null
    if (countdownEl.length > 0) {
        const scheduleLink = $("a[href*='/schedules/']")
        const epText = scheduleLink.text().trim()
        const timestamp = countdownEl.attr("data-countdown-bar-timestamp")
        nextEpisode = {
            numberText: epText,
            timestamp: timestamp ? parseInt(timestamp) : null
        }
    }

    const streams = []
    $(".flex-1.flex.items-center.gap-4.p-4").each((_, el) => {
        const a = $(el).find("a.link")
        if (a.length > 0) {
            const name = a.text().trim()
            const href = a.attr("href")
            const desc = $(el).find(".line-clamp-1").text().trim()
            if (href && name) {
                streams.push({ name, link: href, desc: desc || "" })
            }
        }
    })

    const videos = []
    $(".lc-video").each((_, el) => {
        const title = $(el).find(".text-sm.line-clamp-2.font-bold").text().trim()
        const youtubeUrl = $(el).find("a").attr("href")
        const embedUrl = $(el).attr("data-video-embed-url")
        const duration = $(el).find("[data-video-target='durationBadge']").text().trim()
        videos.push({
            title,
            youtubeUrl: youtubeUrl || "",
            embedUrl: embedUrl || "",
            duration: duration || ""
        })
    })

    return {
        id: String(slug),
        title: schema.name || $("h1").text().trim(),
        alternateTitles: schema.alternateName || [],
        poster: schema.image || "",
        description: schema.description ? cheerio.load(`<div class="md">${schema.description}</div>`).text().trim() : "",
        genres: schema.genre || [],
        episodesCount: schema.numberOfEpisodes || null,
        startDate: schema.datePublished || null,
        studios: (schema.productionCompany || []).map(c => c.name).filter(Boolean),
        rating: schema.aggregateRating?.ratingValue || null,
        ratingCount: schema.aggregateRating?.ratingCount || null,
        status,
        hashtags,
        nextEpisode,
        streams,
        videos
    }
}

export default {
    route: {
        method: "get",
        path: "/anime/livechart",
        auth: false,
        tags: ["Anime"],
        summary: "Search anime via LiveChart",
        description: "Mencari dan mendapatkan detail anime dari LiveChart.me. Parameter 'type' menentukan mode: 'search' untuk pencarian, 'detail' untuk mendapatkan info lengkap anime berdasarkan slug/ID.",
        parameters: [
            {
                name: "query",
                in: "query",
                required: true,
                description: "Kata kunci pencarian atau slug/ID anime (untuk type=detail)",
                schema: { type: "string", example: "frieren" }
            },
            {
                name: "type",
                in: "query",
                required: false,
                description: "Mode: 'search' (default) atau 'detail' (info lengkap anime via slug/ID)",
                schema: { type: "string", enum: ["search", "detail"], default: "search" }
            }
        ],
        responses: {
            "200": {
                description: "OK",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean" },
                                result: { type: "object" }
                            }
                        }
                    }
                }
            }
        }
    },
    handler: async (req, res) => {
        const { query, type = "search" } = req.query
        if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi" })
        try {
            if (type === "detail") {
                const result = await livechartDetail(query)
                res.json({ ok: true, result })
            } else {
                const result = await livechartSearch(query)
                res.json({ ok: true, result })
            }
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

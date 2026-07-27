import * as cheerio from "cheerio"
import axios from "axios"

const BASE_URL = "https://s13.nontonanimeid.boats"
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "id,en-US;q=0.7,en;q=0.3"
}

let lastNonce = null
let lastAjaxUrl = null
let lastUrl = null

async function getSoup(url, params = {}) {
    lastUrl = url
    let finalUrl = url
    if (Object.keys(params).length > 0) {
        const q = new URLSearchParams()
        for (const [k, v] of Object.entries(params)) {
            if (Array.isArray(v)) {
                v.forEach(val => q.append(`${k}[]`, val))
            } else {
                q.append(k, v)
            }
        }
        finalUrl = `${url}?${q.toString()}`
    }

    const response = await axios.get(finalUrl, {
        headers: { ...HEADERS, Referer: BASE_URL }
    })
    const html = response.data
    const $ = cheerio.load(html)
    extractNonceAndAjaxUrl($)
    return $
}

function extractNonceAndAjaxUrl($) {
    $("script").each((i, el) => {
        const src = $(el).attr("src") || ""
        if (src.startsWith("data:text/javascript;base64,")) {
            try {
                const b64Data = src.split("base64,")[1]
                const decoded = Buffer.from(b64Data, "base64").toString("utf-8")
                const nonceMatch = decoded.match(/"nonce"\s*:\s*"([^"]+)"/)
                const urlMatch = decoded.match(/"url"\s*:\s*"([^"]+)"/)
                if (nonceMatch) lastNonce = nonceMatch[1]
                if (urlMatch) lastAjaxUrl = urlMatch[1].replace(/\\/g, "")
            } catch (e) {
                // ignore
            }
        }
    })
}

function parseAnimeCard($, cardEl) {
    const card = $(cardEl)
    const link = card.attr("href") || card.find("a").attr("href") || ""
    const imgTag = card.find("img")
    const image = imgTag.attr("src") || imgTag.attr("data-src") || ""

    let title = ""
    const titleTag = card.find("[class*=\"title\"]")
    if (titleTag.length > 0) {
        const span = titleTag.find("span")
        if (span.length > 0) {
            title = span.attr("data-title-default") || span.text().trim()
        } else {
            title = titleTag.text().trim()
        }
    } else if (imgTag.length > 0) {
        title = imgTag.attr("alt") || ""
    }
    title = title.trim()

    const ratingTag = card.find(".rating, .kotakscore, .as-rating")
    let rating = ""
    if (ratingTag.length > 0) {
        rating = ratingTag.text().replace("⭐", "").trim()
        if (!rating && ratingTag.hasClass("kotakscore")) {
            rating = ratingTag.text().replace(/\n/g, "").trim()
        }
    }

    const typeTag = card.find(".type, .as-type")
    const typeVal = typeTag.length > 0 ? typeTag.text().replace("📺", "").trim() : ""

    const seasonTag = card.find(".season, .as-season")
    const season = seasonTag.length > 0 ? seasonTag.text().replace("📅", "").trim() : ""

    const synopsisTag = card.find(".synopsis, .as-synopsis")
    const synopsis = synopsisTag.length > 0 ? synopsisTag.text().trim() : ""

    let genres = []
    const genresContainer = card.find("[class*=\"genres\"]")
    if (genresContainer.length > 0) {
        genresContainer.find(".genre-tag, .genre-pill, .as-genre-tag").each((i, el) => {
            genres.push($(el).text().trim())
        })
    } else {
        card.find(".genre-tag, .genre-pill, .as-genre-tag").each((i, el) => {
            genres.push($(el).text().trim())
        })
    }

    return { title, link, image, rating, type: typeVal, season, synopsis, genres }
}

async function getHome() {
    const $ = await getSoup(BASE_URL)
    if (!$) return {}

    const data = {
        episode_terbaru: [],
        series_terbaru_movie: [],
        series_terbaru_tv: [],
        popular_series_semua: [],
        popular_genre: [],
        top_rating_anime: [],
        series_popular_summer: []
    }

    // Episode Terbaru
    $("#postbaru article.animeseries").each((i, el) => {
        const article = $(el)
        const aTag = article.find("a")
        if (aTag.length > 0) {
            const link = aTag.attr("href") || ""
            const imgTag = aTag.find("img")
            const image = imgTag.attr("src") || ""
            const titleSpan = aTag.find("h3.title span")
            let title = titleSpan.length > 0 ? (titleSpan.attr("data-title-default") || titleSpan.text().trim()) : ""
            if (!title && imgTag.length > 0) title = imgTag.attr("alt") || ""
            title = title.trim()
            const epSpan = aTag.find("span.types.episodes")
            const episode = epSpan.length > 0 ? epSpan.text().trim() : ""
            const statusSpan = aTag.find("span.types.status")
            const status = statusSpan.length > 0 ? statusSpan.text().trim() : ""
            data.episode_terbaru.push({ title, link, image, episode, status })
        }
    })

    const parseTabContent = (tabId) => {
        const items = []
        $(`#${tabId} div.animeseries`).each((i, el) => {
            const article = $(el)
            const aTag = article.find("a")
            if (aTag.length > 0) {
                const link = aTag.attr("href") || ""
                const imgTag = aTag.find("img")
                const image = imgTag.attr("src") || ""
                const titleDiv = aTag.find("div.title")
                let title = ""
                if (titleDiv.length > 0) {
                    const titleSpan = titleDiv.find("span")
                    title = titleSpan.length > 0 ? (titleSpan.attr("data-title-default") || titleSpan.text().trim()) : titleDiv.text().trim()
                }
                if (!title && imgTag.length > 0) title = imgTag.attr("alt") || ""
                title = title.trim()
                const scoreSpan = aTag.find("span.kotakscore")
                const score = scoreSpan.length > 0 ? scoreSpan.text().replace(/\n/g, "").replace(/ /g, "").replace("⭐", "").trim() : ""
                items.push({ title, link, image, score })
            }
        })
        return items
    }

    data.series_terbaru_movie = parseTabContent("tab-7")
    data.series_terbaru_tv = parseTabContent("tab-8")
    data.popular_series_semua = parseTabContent("tab-9")
    data.popular_genre = parseTabContent("tab-10")

    // Top Rating Anime
    const sidebar = $("#sidebar_right").length > 0 ? $("#sidebar_right") : $("body")
    let topRatingHeader = null
    sidebar.find("h3, h2").each((i, el) => {
        if ($(el).text().includes("Top Rating Anime")) topRatingHeader = $(el)
    })
    if (topRatingHeader) {
        const ul = $(topRatingHeader).nextAll("ul.latestepisodes").first()
        if (ul.length > 0) {
            ul.find("li").each((i, el) => {
                const li = $(el)
                const aTag = li.find("a")
                if (aTag.length > 0) {
                    const link = aTag.attr("href") || ""
                    const lefts = aTag.find("div.lefts")
                    const rights = aTag.find("div.rights")
                    const title = lefts.length > 0 ? lefts.text().trim() : ""
                    const videoNum = rights.length > 0 ? rights.find("span.video").text().trim() : ""
                    data.top_rating_anime.push({ title, link, episodes_count: videoNum })
                }
            })
        }
    }

    // Series Popular Summer
    let popularSummerHeader = null
    sidebar.find("h3, h2").each((i, el) => {
        if ($(el).text().includes("Series Popular Summer")) popularSummerHeader = $(el)
    })
    if (popularSummerHeader) {
        const kotakbatas = $(popularSummerHeader).nextAll("div.kotakbatas").first()
        if (kotakbatas.length > 0) {
            kotakbatas.find("div.bor").each((i, el) => {
                const aTag = $(el).find("a.popseries")
                if (aTag.length > 0) {
                    const link = aTag.attr("href") || ""
                    const imgTag = aTag.find("img")
                    const image = imgTag.attr("src") || ""
                    const title = imgTag.attr("alt") || ""
                    data.series_popular_summer.push({ title: title.trim(), link, image })
                }
            })
        }
    }

    return data
}

async function searchAnime(query, page = 1) {
    const url = page > 1 ? `${BASE_URL}/page/${page}/` : `${BASE_URL}/`
    const $ = await getSoup(url, { s: query })
    if (!$) return []

    const results = []
    const gridContainer = $("div.result")
    if (gridContainer.length > 0) {
        const cards = gridContainer.find("a.as-anime-card")
        if (cards.length > 0) {
            cards.each((i, el) => {
                results.push(parseAnimeCard($, el))
            })
        } else {
            gridContainer.find("div.animeseries").each((i, el) => {
                const aTag = $(el).find("a")
                if (aTag.length > 0) results.push(parseAnimeCard($, aTag))
            })
        }
    }
    return results
}

async function getAnimeDetail(animeSlug) {
    const url = animeSlug.startsWith("http") ? animeSlug : `${BASE_URL}/anime/${animeSlug}/`
    const $ = await getSoup(url)
    if (!$) return {}

    const titleH1 = $("h1.entry-title")
    let title = ""
    if (titleH1.length > 0) {
        const span = titleH1.find("span")
        title = span.length > 0 ? (span.attr("data-title-default") || span.text().trim()) : titleH1.text().replace("Nonton", "").replace("Sub Indo", "").trim()
    }

    let poster = ""
    let score = ""
    let typeVal = ""
    let trailer = ""
    const animeCard = $("div.anime-card")
    if (animeCard.length > 0) {
        const sidebar = animeCard.find("div.anime-card__sidebar")
        if (sidebar.length > 0) {
            const imgTag = sidebar.find("img")
            poster = imgTag.attr("src") || ""
            const scoreDiv = sidebar.find("div.anime-card__score")
            if (scoreDiv.length > 0) {
                const valSpan = scoreDiv.find("span.value")
                score = valSpan.length > 0 ? valSpan.text().trim() : ""
                const typeSpan = scoreDiv.find("span.type")
                typeVal = typeSpan.length > 0 ? typeSpan.text().trim() : ""
            }
            const trailerA = sidebar.find("a.trailerbutton")
            trailer = trailerA.attr("href") || ""
        }
    }

    let details = {}
    let synopsis = ""
    let genres = []
    if (animeCard.length > 0) {
        const mainInfo = animeCard.find("div.anime-card__main")
        if (mainInfo.length > 0) {
            const detailsUl = mainInfo.find("ul.details-list")
            if (detailsUl.length > 0) {
                detailsUl.find("li").each((i, el) => {
                    const li = $(el)
                    const labelTag = li.find("strong, span.detail-label")
                    if (labelTag.length > 0) {
                        const label = labelTag.text().replace(":", "").trim()
                        const valText = li.text().replace(labelTag.text(), "").trim()
                        details[label] = valText
                    }
                })
            }

            const genresDiv = mainInfo.find("div.anime-card__genres")
            if (genresDiv.length > 0) {
                genresDiv.find("a").each((i, el) => {
                    genres.push({ name: $(el).text().trim(), link: $(el).attr("href") || "" })
                })
            }

            const synDiv = mainInfo.find("div#tab-synopsis")
            if (synDiv.length > 0) synopsis = synDiv.text().trim()
        }
    }

    let status = ""
    let totalEpisodes = ""
    let episodeDuration = ""
    let season = ""
    let seasonLink = ""
    const quickInfo = $("div.anime-card__quick-info")
    if (quickInfo.length > 0) {
        const statusSpan = quickInfo.find("span[class*=\"status\"]")
        status = statusSpan.length > 0 ? statusSpan.text().trim() : ""
        quickInfo.find("span.info-item").each((i, el) => {
            const text = $(el).text()
            if (text.toLowerCase().includes("episodes")) totalEpisodes = text.trim()
            else if (text.includes("min") || text.includes("menit")) episodeDuration = text.trim()
        })
        const seasonA = quickInfo.find("span.season a")
        if (seasonA.length > 0) {
            season = seasonA.text().trim()
            seasonLink = seasonA.attr("href") || ""
        }
    }

    let episodes = []
    const epSection = $("section.anime-card__episode-list-section")
    if (epSection.length > 0) {
        const epItems = epSection.find("div.episode-list-items")
        if (epItems.length > 0) {
            epItems.find("a.episode-item").each((i, el) => {
                const aItem = $(el)
                const link = aItem.attr("href") || ""
                const titleSpan = aItem.find("span.ep-title")
                const epTitle = titleSpan.length > 0 ? titleSpan.text().trim() : ""
                const dateSpan = aItem.find("span.ep-date")
                const epDate = dateSpan.length > 0 ? dateSpan.text().trim() : ""
                episodes.push({ title: epTitle, link, date: epDate })
            })
        }
    }

    let recommended = []
    const relatedDiv = $("div.related")
    if (relatedDiv.length > 0) {
        relatedDiv.find("a.as-anime-card").each((i, el) => {
            recommended.push(parseAnimeCard($, el))
        })
    }

    return {
        title,
        poster,
        score,
        type: typeVal,
        trailer,
        synopsis,
        genres,
        details,
        status,
        total_episodes: totalEpisodes,
        episode_duration: episodeDuration,
        season,
        season_link: seasonLink,
        episodes,
        recommended_series: recommended
    }
}

async function getStreamingDetail(episodeSlug) {
    const url = episodeSlug.startsWith("http") ? episodeSlug : `${BASE_URL}/${episodeSlug}/`
    const $ = await getSoup(url)
    if (!$) return {}

    const title = $("h1.entry-title").text().trim()

    let animeTitle = ""
    let animeLink = ""
    const breadcrumbs = $("nav.breadcrumbs")
    if (breadcrumbs.length > 0) {
        const links = breadcrumbs.find("a").filter((i, el) => $(el).attr("href"))
        if (links.length > 0) {
            const lastLink = links.last()
            animeTitle = lastLink.text().trim()
            animeLink = lastLink.attr("href") || ""
        }
    }

    let prevLink = null
    let nextLink = null
    let allEpsLink = null
    const naveps = $("div.naveps")
    if (naveps.length > 0) {
        naveps.find("div.nvs").each((i, el) => {
            const nvs = $(el)
            const aTag = nvs.find("a")
            if (aTag.length > 0) {
                const href = aTag.attr("href") || ""
                const label = aTag.text().toLowerCase()
                if (label.includes("prev")) prevLink = href
                else if (label.includes("next")) nextLink = href
                else if (label.includes("all") || label.includes("episode")) allEpsLink = href
            } else if (nvs.hasClass("nvsc")) {
                const aTagC = nvs.find("a")
                if (aTagC.length > 0) allEpsLink = aTagC.attr("href") || ""
            }
        })
    }

    let defaultVideoUrl = ""
    const videoku = $("div#videoku")
    if (videoku.length > 0) {
        const iframe = videoku.find("iframe")
        if (iframe.length > 0) defaultVideoUrl = iframe.attr("src") || iframe.attr("data-src") || ""
    }

    let videoServers = []
    const playerTabs = $("ul.player")
    if (playerTabs.length > 0) {
        playerTabs.find("li.serverplayer").each((i, el) => {
            const li = $(el)
            videoServers.push({
                server_name: li.text().trim(),
                post_id: li.attr("data-post") || "",
                server_type: li.attr("data-type") || "",
                nume: li.attr("data-nume") || "",
                is_active: li.hasClass("on")
            })
        })
    }

    let downloadLinks = []
    const downloadArea = $("div#download_area")
    if (downloadArea.length > 0) {
        const arealinker = downloadArea.find("div#arealinker")
        if (arealinker.length > 0) {
            arealinker.find("div.listlink").each((i, el) => {
                const listlink = $(el)
                const spanTag = listlink.find("span")
                const formatName = spanTag.length > 0 ? spanTag.text().trim() : "Unknown"
                let links = []
                listlink.find("a").each((j, aEl) => {
                    links.push({ label: $(aEl).text().trim(), url: $(aEl).attr("href") || "" })
                })
                downloadLinks.push({ format: formatName, links })
            })
        }
    }

    return {
        title,
        anime_title: animeTitle,
        anime_link: animeLink,
        prev_episode_link: prevLink,
        next_episode_link: nextLink,
        all_episodes_link: allEpsLink,
        default_video_url: defaultVideoUrl,
        video_servers: videoServers,
        download_links: downloadLinks,
        nonce: lastNonce,
        ajax_url: lastAjaxUrl
    }
}

export default {
    route: {
        method: "get",
        path: "/anime/nontonanime",
        auth: false,
        tags: ["Anime"],
        summary: "Search anime via NontonAnimeID",
        description: "Browse homepage sections, search anime, get detailed anime info, or get streaming/episode details from NontonAnimeID",
        parameters: [
            { name: "type", in: "query", required: false, description: "Action type: home, search, detail, episode (default: home)", schema: { type: "string" } },
            { name: "query", in: "query", required: false, description: "Search keyword (required for search)", schema: { type: "string" } },
            { name: "slug", in: "query", required: false, description: "Anime or episode slug (required for detail/episode)", schema: { type: "string" } },
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
                const result = await searchAnime(query, parseInt(page) || 1)
                return res.json({ ok: true, result })
            }

            if (action === "detail") {
                if (!slug) return res.status(400).json({ ok: false, error: "slug wajib diisi untuk detail" })
                const result = await getAnimeDetail(slug)
                return res.json({ ok: true, result })
            }

            if (action === "episode") {
                if (!slug) return res.status(400).json({ ok: false, error: "slug wajib diisi untuk episode" })
                const result = await getStreamingDetail(slug)
                return res.json({ ok: true, result })
            }

            return res.status(400).json({ ok: false, error: `type "${action}" tidak valid. Gunakan: home, search, detail, episode` })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

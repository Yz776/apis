// /search/gsmarena — Cari handphone di GSMArena + ambil spec lengkap
//
// GSMArena sekarang diproteksi Cloudflare Turnstile (anti-bot), jadi
// kita pakai r.jina.ai sebagai reader proxy dengan header `X-No-Cache: true`
// untuk bypass challenge + render halaman seperti browser asli.
//
// Mendukung 2 mode:
// 1. ?query=iphone%2015 → cari handphone, return list + thumbnail
// 2. ?url=https://www.gsmarena.com/apple_iphone_15-12559.php → ambil spec lengkap
//
// Bisa juga pakai ?slug=apple_iphone_15-12559 (ID halaman GSMArena tanpa .php).

import axios from "axios"
import * as cheerio from "cheerio"

const JINA_READER = "https://r.jina.ai"
const GSMARENA = "https://www.gsmarena.com"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

// Reader-proxy helper: r.jina.ai bypass Cloudflare Turnstile + return raw HTML
// r.jina.ai returns small cached response (237-2700 bytes = Turnstile challenge) for some URLs.
// Detail pages (apple_iphone_15-12559.php) typically work; search.php3 / res.php3 are blocked.
// Strategy: retry up to 3x with backoff, accept response only if size > 5000 bytes.
async function fetchViaJina(targetUrl) {
    let lastErr
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const { data, status } = await axios.get(`${JINA_READER}/${targetUrl}`, {
                headers: {
                    "X-No-Cache": "true",
                    "X-Return-Format": "html",
                    "X-Timeout": "60",
                    "Accept": "text/html,application/xhtml+xml",
                },
                timeout: 75000,
                validateStatus: () => true,
                responseType: "text",
                maxRedirects: 5,
            })
            // GSMArena detail pages typically return 50KB+ HTML
            if (status === 200 && data && data.length > 5000) {
                return data
            }
            if (status === 403 || status === 429) {
                lastErr = new Error(`GSMArena reader rate-limited (HTTP ${status}).`)
                await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
                continue
            }
            // Small response (Turnstile cached, ~2KB) — don't keep retrying forever
            lastErr = new Error(`GSMArena mengembalikan halaman anti-bot Turnstile (size=${data?.length || 0}). Endpoint ini diblokir Cloudflare, mungkin URL harus diakses via /search/gsmarena?slug= atau coba endpoint lain.`)
            // Don't retry — just exit fast
            break
        } catch (e) {
            lastErr = e
            await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
        }
    }
    throw lastErr || new Error("GSMArena reader gagal")
}

// Mode 1: Search GSMArena phones
// Strategy:
// 1. First try /res.php3?sName={query} (search results page) — usually blocked by Turnstile
// 2. Fall back to scraping brand pages by matching first word of query
// 3. Brand URL pattern: /{brand-slug}-phones-{id}.php
async function searchGsmArena(query) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean)
    const firstWord = queryWords[0]

    // Attempt 1: Search results page (works sometimes via r.jina.ai)
    let searchError = null
    try {
        const url = `${GSMARENA}/res.php3?sName=${encodeURIComponent(query)}`
        const html = await fetchViaJina(url)
        const $ = cheerio.load(html)
        const phones = parseMakersList($)
        if (phones.length > 0) {
            // Filter by all query words
            const filtered = phones.filter((p) => {
                const phoneName = (p.name || "").toLowerCase()
                return queryWords.every((qw) => phoneName.includes(qw))
            })
            if (filtered.length > 0) {
                return { phones: filtered, source: "search-results" }
            }
        }
    } catch (e) {
        searchError = e.message
    }

    // Attempt 2: Brand page by first word (apple, samsung, xiaomi, dll)
    const brandCandidates = findBrandCandidates(firstWord)
    if (brandCandidates.length === 0) {
        return {
            phones: [],
            source: "brand-pages",
            error: searchError || `Brand tidak dikenali: "${firstWord}". Coba brand populer: apple, samsung, xiaomi, oppo, vivo, realme, oneplus, google, motorola, huawei, honor, sony, nokia, nothing, infinix, tecno, asus, lg, htc, lenovo, microsoft, meizu, blackberry, zte, sharp, poco, iqoo.`,
        }
    }

    const allPhones = []
    for (const brand of brandCandidates) {
        try {
            // Fetch first page (latest 50 phones)
            const url1 = `${GSMARENA}/${brand.slug}.php`
            const html1 = await fetchViaJina(url1)
            const $1 = cheerio.load(html1)
            const brandPhones = parseMakersList($1)
            allPhones.push(...brandPhones)

            // Check if first page has any match — if yes, we're done
            // If not, fetch up to 4 more pages (50 phones each, total ~250)
            const remainingWords = queryWords.slice(1)
            const hasMatchOnPage1 = remainingWords.length === 0 || brandPhones.some((p) => {
                const haystack = `${p.name} ${p.description || ""} ${p.slug || ""}`.toLowerCase()
                return remainingWords.every((qw) => matchQuery(qw, haystack))
            })

            if (!hasMatchOnPage1 && remainingWords.length > 0) {
                // Find first "Next page" link, then paginate up to 4 more pages
                let nextHref = $1('a.prevnextbutton[title="Next page"]').attr("href")
                for (let pageNum = 2; pageNum <= 5 && nextHref; pageNum++) {
                    try {
                        const urlN = `${GSMARENA}/${nextHref.replace(/\.php3?$/, "")}.php`
                        const htmlN = await fetchViaJina(urlN)
                        const $n = cheerio.load(htmlN)
                        const pageNPhones = parseMakersList($n)
                        allPhones.push(...pageNPhones)
                        // Stop early if we found matches on this page
                        const hasMatch = pageNPhones.some((p) => {
                            const haystack = `${p.name} ${p.description || ""} ${p.slug || ""}`.toLowerCase()
                            return remainingWords.every((qw) => matchQuery(qw, haystack))
                        })
                        if (hasMatch) break
                        // Get next page link
                        nextHref = $n('a.prevnextbutton[title="Next page"]').attr("href")
                    } catch {
                        break
                    }
                }
            }
        } catch {}
    }

    // Filter by remaining query words (skip first word = brand)
    const remainingWords = queryWords.slice(1)
    const filtered = allPhones.filter((p) => {
        if (remainingWords.length === 0) return true
        const haystack = `${p.name} ${p.description || ""} ${p.slug || ""}`.toLowerCase()
        return remainingWords.every((qw) => matchQuery(qw, haystack))
    })
    return { phones: filtered, source: "brand-pages" }
}

// Match query word against haystack with word-boundary for short tokens
function matchQuery(qw, haystack) {
    if (qw.length <= 3) {
        // word boundary to avoid "8" matching "18"
        return new RegExp(`\\b${qw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(haystack)
    }
    return haystack.includes(qw)
}

// Parse ".makers li" HTML structure → array of phones
// Format: <li><a href="slug-12345.php"><img src="..." title="..."><strong><span>Name</span></strong></a></li>
// Some pages use just <span> without <strong>
function parseMakersList($) {
    const phones = []
    $(".makers ul li, .makers li").each((_, el) => {
        const $li = $(el)
        const $a = $li.find("a").first()
        const href = $a.attr("href") || ""
        const $img = $li.find("img").first()
        const $span = $li.find("span").first()
        // Phone name: span text (strip any nested tags like <strong>)
        const name = $span.text().trim()
        if (href && /\.php3?$/.test(href)) {
            const slug = href.replace(/\.php3?$/, "")
            phones.push({
                name,
                slug,
                url: `${GSMARENA}/${slug}.php`,
                image: $img.attr("src") || $img.attr("data-src") || null,
                description: $img.attr("title") || null,
            })
        }
    })
    return phones
}

// Common brand slug mapping for fallback search
// Maps first word of query → brand page slug
function findBrandCandidates(firstWord) {
    const BRAND_MAP = {
        // Direct brand names
        apple: [{ slug: "apple-phones-48", brand: "Apple" }],
        iphone: [{ slug: "apple-phones-48", brand: "Apple" }],
        ipad: [{ slug: "apple-phones-48", brand: "Apple" }],
        samsung: [{ slug: "samsung-phones-9", brand: "Samsung" }],
        galaxy: [{ slug: "samsung-phones-9", brand: "Samsung" }],
        xiaomi: [{ slug: "xiaomi-phones-80", brand: "Xiaomi" }],
        redmi: [{ slug: "xiaomi-phones-80", brand: "Xiaomi" }],
        poco: [{ slug: "xiaomi-phones-80", brand: "Xiaomi" }],
        oppo: [{ slug: "oppo-phones-78", brand: "Oppo" }],
        vivo: [{ slug: "vivo-phones-98", brand: "Vivo" }],
        realme: [{ slug: "realme-phones-118", brand: "Realme" }],
        huawei: [{ slug: "huawei-phones-58", brand: "Huawei" }],
        honor: [{ slug: "honor-phones-79", brand: "Honor" }],
        oneplus: [{ slug: "oneplus-phones-95", brand: "OnePlus" }],
        one: [{ slug: "oneplus-phones-95", brand: "OnePlus" }],
        motorola: [{ slug: "motorola-phones-4", brand: "Motorola" }],
        moto: [{ slug: "motorola-phones-4", brand: "Motorola" }],
        google: [{ slug: "google-phones-107", brand: "Google" }],
        pixel: [{ slug: "google-phones-107", brand: "Google" }],
        sony: [{ slug: "sony-phones-7", brand: "Sony" }],
        xperia: [{ slug: "sony-phones-7", brand: "Sony" }],
        nokia: [{ slug: "nokia-phones-1", brand: "Nokia" }],
        nothing: [{ slug: "nothing-phones-130", brand: "Nothing" }],
        infinix: [{ slug: "infinix-phones-122", brand: "Infinix" }],
        tecno: [{ slug: "tecno-phones-120", brand: "Tecno" }],
        asus: [{ slug: "asus-phones-46", brand: "Asus" }],
        rog: [{ slug: "asus-phones-46", brand: "Asus" }],
        zenfone: [{ slug: "asus-phones-46", brand: "Asus" }],
        lg: [{ slug: "lg-phones-20", brand: "LG" }],
        htc: [{ slug: "htc-phones-45", brand: "HTC" }],
        lenovo: [{ slug: "lenovo-phones-66", brand: "Lenovo" }],
        microsoft: [{ slug: "microsoft-phones-64", brand: "Microsoft" }],
        surface: [{ slug: "microsoft-phones-64", brand: "Microsoft" }],
        meizu: [{ slug: "meizu-phones-42", brand: "Meizu" }],
        blackberry: [{ slug: "blackberry-phones-44", brand: "BlackBerry" }],
        zte: [{ slug: "zte-phones-62", brand: "ZTE" }],
        nubia: [{ slug: "zte-phones-62", brand: "ZTE" }],
        sharp: [{ slug: "sharp-phones-25", brand: "Sharp" }],
        iqoo: [{ slug: "iqoo-phones-121", brand: "iQOO" }],
        blackshark: [{ slug: "xiaomi-phones-80", brand: "Xiaomi (Black Shark)" }],
        black: [{ slug: "xiaomi-phones-80", brand: "Xiaomi (Black Shark)" }],
    }
    return BRAND_MAP[firstWord] || []
}

// Mode 2: Scrape halaman detail handphone → spec lengkap
async function getDeviceSpecs(deviceUrl) {
    const html = await fetchViaJina(deviceUrl)
    const $ = cheerio.load(html)

    // Phone name
    const name = $(".specs-phone-name-title").text().trim() || $("h1.specs-phone-name-title").text().trim()
    // Main image
    const img = $(".specs-photo-main a img").attr("src") || $(".specs-photo-main img").attr("src")

    // Quick specs (highlights) — bagian atas halaman
    const quickSpec = []
    const quickSpecsMap = {
        "displaysize-hl": "Display size",
        "displayres-hl": "Display resolution",
        "videopixels-hl": "Video pixels",
        "chipset-hl": "Chipset",
        "battype-hl": "Battery type",
    }
    for (const [dataSpec, label] of Object.entries(quickSpecsMap)) {
        const val = $(`[data-spec="${dataSpec}"]`).text().trim()
        if (val) quickSpec.push({ name: label, value: val })
    }
    // Highlight classes
    const cameraPixels = $(".accent-camera").text().trim()
    if (cameraPixels) quickSpec.push({ name: "Camera pixels", value: cameraPixels })
    const ramSize = $(".accent-expansion").text().trim()
    if (ramSize) quickSpec.push({ name: "RAM size", value: ramSize })
    const batterySize = $(".accent-battery").text().trim()
    if (batterySize) quickSpec.push({ name: "Battery size", value: batterySize })

    // Detailed specifications table
    const detailSpec = []
    $("table").each((_, tableEl) => {
        const $table = $(tableEl)
        const category = $table.find("th").text().trim()
        if (!category) return
        const specList = []
        $table.find("tr").each((_, trEl) => {
            const $tr = $(trEl)
            const name = $tr.find("td.ttl").text().trim()
            const value = $tr.find("td.nfo").text().trim()
            if (value) {
                specList.push({
                    name: name || "—",
                    value,
                })
            }
        })
        if (specList.length) {
            detailSpec.push({ category, specifications: specList })
        }
    })

    return { name, img, quickSpec, detailSpec }
}

export default {
    route: {
        method: "get",
        path: "/search/gsmarena",
        auth: false,
        tags: ["Search"],
        summary: "Cari handphone di GSMArena + ambil spec lengkap",
        description:
            "Cari handphone di GSMArena (m.gsmarena.com / www.gsmarena.com) atau ambil spec lengkap " +
            "handphone tertentu.\n\n" +
            "**Mode 1 — Pencarian** (`?query=`):\n" +
            "```\n/search/gsmarena?query=iphone%2015\n```\n" +
            "Mengembalikan berita + review terkait (data dari search-json GSMArena).\n\n" +
            "**Mode 2 — Detail spec** (`?url=` atau `?slug=`):\n" +
            "```\n/search/gsmarena?url=https://www.gsmarena.com/apple_iphone_15-12559.php\n/search/gsmarena?slug=apple_iphone_15-12559\n```\n" +
            "Mengembalikan: nama, gambar, quick specs (display, camera, RAM, chipset, battery), " +
            "dan detail spec lengkap per kategori (Network, Launch, Body, Display, Platform, Memory, " +
            "Camera, Sound, Comms, Features, Battery, Misc, Tests).\n\n" +
            "**Catatan:** GSMArena diproteksi Cloudflare Turnstile. Endpoint ini melewati r.jina.ai " +
            "reader proxy untuk bypass challenge. Kadang respons lambat (3-10 detik) — wajar karena " +
            "akan di-render dulu oleh proxy.",
        parameters: [
            {
                name: "query",
                in: "query",
                required: false,
                description: "Kata kunci pencarian. Jika diisi, jalankan mode pencarian (return news + reviews).",
                schema: { type: "string", example: "iphone 15" },
            },
            {
                name: "url",
                in: "query",
                required: false,
                description: "URL lengkap halaman GSMArena (mis. https://www.gsmarena.com/apple_iphone_15-12559.php). Jika diisi, jalankan mode detail spec.",
                schema: { type: "string", example: "https://www.gsmarena.com/apple_iphone_15-12559.php" },
            },
            {
                name: "slug",
                in: "query",
                required: false,
                description: "Slug device GSMArena tanpa URL (mis. apple_iphone_15-12559). Alternatif untuk `url`.",
                schema: { type: "string", example: "apple_iphone_15-12559" },
            },
        ],
        responses: {
            "200": {
                description: "Hasil pencarian atau detail spec",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean", example: true },
                                mode: { type: "string", enum: ["search", "detail"] },
                                query: { type: "string", description: "Kata kunci (mode=search)" },
                                news: { type: "array", items: { type: "object" } },
                                reviews: { type: "array", items: { type: "object" } },
                                // Mode detail:
                                name: { type: "string" },
                                img: { type: "string" },
                                quickSpec: { type: "array", items: { type: "object" } },
                                detailSpec: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            category: { type: "string" },
                                            specifications: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        name: { type: "string" },
                                                        value: { type: "string" },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            "400": { description: "Parameter tidak valid" },
            "500": { description: "Gagal fetch GSMArena" },
        },
    },

    handler: async (req, res) => {
        const { query, url, slug } = req.query

        // Mode detail: prioritas url, lalu slug
        if (url || slug) {
            let deviceUrl = url
            if (!deviceUrl && slug) {
                deviceUrl = `${GSMARENA}/${slug}.php`
            }
            // Validate URL
            if (!/^https?:\/\/(www\.|m\.)?gsmarena\.com\//i.test(deviceUrl)) {
                return res.status(400).json({
                    ok: false,
                    error: "URL harus dari gsmarena.com (mis. https://www.gsmarena.com/apple_iphone_15-12559.php)",
                })
            }
            try {
                const result = await getDeviceSpecs(deviceUrl)
                if (!result.name && !result.detailSpec.length) {
                    return res.status(404).json({
                        ok: false,
                        error: "Halaman tidak ditemukan atau spec tidak bisa diparse. Pastikan URL benar.",
                    })
                }
                return res.json({ ok: true, mode: "detail", url: deviceUrl, ...result })
            } catch (e) {
                return res.status(500).json({ ok: false, error: e.message })
            }
        }

        // Mode search
        if (!query || !String(query).trim()) {
            return res.status(400).json({
                ok: false,
                error: "Salah satu parameter wajib diisi: ?query= (search) atau ?url=/?slug= (detail)",
                hint: "Contoh: ?query=iphone%2015 atau ?slug=apple_iphone_15-12559",
            })
        }
        try {
            const result = await searchGsmArena(String(query).trim())
            if (!result.phones || result.phones.length === 0) {
                return res.status(404).json({
                    ok: false,
                    error: result.error || `Tidak ada hasil pencarian untuk "${query}". Coba kata kunci lain.`,
                })
            }
            // Limit to top 30 results (a brand can have 100+ phones)
            const limited = result.phones.slice(0, 30)
            return res.json({
                ok: true,
                mode: "search",
                query: String(query).trim(),
                total: result.phones.length,
                returned: limited.length,
                source: result.source,
                phones: limited,
                hint: "Untuk spec lengkap, ambil slug/url dari hasil di atas dan kirim ke ?url= atau ?slug=",
            })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

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
// Strategy: 1 retry only (was 2), 20s timeout (was 30s).
// Production note: Cloudflare 60s timeout means total request must finish < 50s.
async function fetchViaJina(targetUrl) {
    let lastErr
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const { data, status } = await axios.get(`${JINA_READER}/${targetUrl}`, {
                headers: {
                    "X-No-Cache": "true",
                    "X-Return-Format": "html",
                    "X-Timeout": "20",
                    "Accept": "text/html,application/xhtml+xml",
                },
                timeout: 25000,
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
                await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
                continue
            }
            // Small response (Turnstile cached, ~2KB) — don't keep retrying forever
            lastErr = new Error(`GSMArena mengembalikan halaman anti-bot Turnstile (size=${data?.length || 0}).`)
            break
        } catch (e) {
            lastErr = e
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
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
    // Split on whitespace AND hyphens so "vivo-V2434" → ["vivo", "v2434"]
    const queryWords = query.toLowerCase().split(/[\s-]+/).filter(Boolean)
    const firstWord = queryWords[0]
    const remainingWords = queryWords.slice(1)
    const modelCode = remainingWords.join(" ") // e.g. "v2434" or "rmx3630"

    // Detect model-code pattern: e.g. V2434, RMX3630, MZB, etc.
    // (1-4 letters + 3-5 digits, optionally followed by more letters/digits)
    const isModelCode = /^[a-z]{1,4}\d{3,6}[a-z0-9]*$/i.test(modelCode)

    // Attempt 1: Search results page (works sometimes via r.jina.ai)
    // — but only try this if query has multiple words (single-word brand like "vivo" doesn't need search)
    let searchError = null
    if (queryWords.length > 1) {
        try {
            const url = `${GSMARENA}/res.php3?sName=${encodeURIComponent(query)}`
            const html = await fetchViaJina(url)
            const $ = cheerio.load(html)
            const phones = parseMakersList($)
            if (phones.length > 0) {
                const filtered = phones.filter((p) => {
                    const haystack = `${p.name} ${p.description || ""} ${p.slug || ""}`.toLowerCase()
                    return queryWords.every((qw) => matchQuery(qw, haystack))
                })
                if (filtered.length > 0) {
                    return { phones: filtered, source: "search-results" }
                }
            }
        } catch (e) {
            searchError = e.message
        }
    }

    // Attempt 2: Brand page by first word (apple, samsung, xiaomi, dll)
    const brandCandidates = findBrandCandidates(firstWord)
    if (brandCandidates.length === 0) {
        return {
            phones: [],
            source: "brand-pages",
            error: `Brand tidak dikenali: "${firstWord}". Coba brand populer: apple, iphone, ipad, samsung, galaxy, xiaomi, redmi, poco, oppo, vivo, realme, huawei, honor, oneplus, motorola, moto, google, pixel, sony, xperia, nokia, nothing, infinix, tecno, asus, rog, zenfone, lg, htc, lenovo, microsoft, surface, meizu, blackberry, zte, nubia, sharp, iqoo.`,
        }
    }

    // Attempt 3 (model-code search): If query is a model-code pattern like "vivo-V2434"
    // → fetch detail pages of brand phones and check the "Models" spec field (Misc → Models).
    // GSMArena stores model codes in data-spec="models" field, NOT in the brand-page listing.
    // This is the only reliable way to map "V2434" → "Vivo Y29 4G".
    if (isModelCode && modelCode.length >= 4) {
        const modelResults = await searchByModelCode(modelCode, brandCandidates)
        if (modelResults.length > 0) {
            return { phones: modelResults, source: "model-code-search" }
        }
        // If model-code search found nothing, fall through to brand-page list (return all)
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
    const filtered = allPhones.filter((p) => {
        if (remainingWords.length === 0) return true
        const haystack = `${p.name} ${p.description || ""} ${p.slug || ""}`.toLowerCase()
        return remainingWords.every((qw) => matchQuery(qw, haystack))
    })

    // If filter returns nothing but brand has phones, return ALL brand phones
    // with helpful hint — user might be searching for a model code (V2434) that
    // isn't in the phone's name (GSMArena lists phones by marketing name, not model code)
    if (filtered.length === 0 && allPhones.length > 0) {
        return {
            phones: allPhones,
            source: "brand-pages",
            error: `Tidak ada match spesifik untuk "${query}". GSMArena menyimpan phone by nama marketing (mis. "Vivo Y36") bukan kode model (mis. "V2434"). Menampilkan semua ${allPhones.length} phone dari brand "${firstWord}" — cari manual yang cocok, atau coba cari via ?slug= kalau sudah tahu URL-nya.`,
        }
    }

    return { phones: filtered, source: "brand-pages" }
}

// Model-code search: fetch detail pages of brand phones and check the "Models" spec field.
// GSMArena stores phone model codes (e.g., V2434, RMX3630) in the Misc → Models spec field,
// NOT in the brand-page listing. So we need to fetch each candidate's detail page and
// grep for the model code in the data-spec="models" field.
//
// Strategy:
//   1. Fetch first page of brand (50 phones)
//   2. Take FIRST 20 phones only (limit to avoid Cloudflare 60s timeout in production)
//   3. Fetch detail page in batches of 5 parallel (10 if user wants faster)
//   4. Check if model code appears anywhere in the page
//   5. If found, return immediately with model code + Models spec field
//
// Performance: 20 phones × 5s avg / 5 parallel = ~20-25s total.
// Production Cloudflare allows ~60s, so this fits comfortably.
//
// Limitation: Only checks 20 most recent phones. For older models (2022 and before),
// user should use ?slug= directly with Google-searched URL.
const MODEL_SEARCH_MAX_PHONES = 20 // max 20 phones (was 50)
const MODEL_SEARCH_BATCH_SIZE = 5  // fetch 5 detail pages in parallel (was 10)
const MODEL_SEARCH_TIMEOUT_MS = 25000 // hard timeout per batch (5 phones × 5s = 25s max)

async function searchByModelCode(modelCode, brandCandidates) {
    const upperCode = modelCode.toUpperCase()
    const matched = []
    const checked = { count: 0 }
    const startTime = Date.now()

    for (const brand of brandCandidates) {
        if (matched.length > 0 || checked.count >= MODEL_SEARCH_MAX_PHONES) break
        if (Date.now() - startTime > MODEL_SEARCH_TIMEOUT_MS) break

        // Fetch first page of brand
        let brandPhones = []
        try {
            const url1 = `${GSMARENA}/${brand.slug}.php`
            const html1 = await fetchViaJina(url1)
            const $1 = cheerio.load(html1)
            brandPhones = parseMakersList($1)
        } catch {
            continue
        }

        // Limit to first 20 phones (top 20 most recent from this brand)
        const phonesToCheck = brandPhones.slice(0, MODEL_SEARCH_MAX_PHONES - checked.count)

        // Check each phone's detail page for the model code (in batches of 5)
        const checkBatch = async (phones) => {
            const results = await Promise.all(
                phones.map(async (phone) => {
                    try {
                        const html = await fetchViaJina(phone.url)
                        return { phone, html }
                    } catch {
                        return null
                    }
                })
            )
            const found = []
            for (const r of results) {
                if (!r) continue
                // Check if model code appears anywhere in the detail page (case-insensitive)
                const pageUpper = r.html.toUpperCase()
                if (pageUpper.includes(upperCode)) {
                    // Extract Models spec value for confirmation
                    const m = r.html.match(/data-spec="models">([^<]+)/i)
                    const modelsField = m ? m[1].trim() : null
                    found.push({
                        ...r.phone,
                        matchedModelCode: upperCode,
                        modelsField,
                    })
                }
            }
            return found
        }

        for (let i = 0; i < phonesToCheck.length; i += MODEL_SEARCH_BATCH_SIZE) {
            if (checked.count >= MODEL_SEARCH_MAX_PHONES) break
            if (Date.now() - startTime > MODEL_SEARCH_TIMEOUT_MS) break
            const batch = phonesToCheck.slice(i, i + MODEL_SEARCH_BATCH_SIZE)
            const found = await checkBatch(batch)
            checked.count += batch.length
            matched.push(...found)
            if (matched.length > 0) break
        }
    }

    return matched
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
                ...(result.error ? { warning: result.error } : {}),
                phones: limited,
                hint: "Untuk spec lengkap, ambil slug/url dari hasil di atas dan kirim ke ?url= atau ?slug=",
            })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

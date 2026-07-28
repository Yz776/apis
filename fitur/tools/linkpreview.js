import * as cheerio from "cheerio"

// Banyak situs (TikTok, FB) hanya menyajikan og-tags untuk UA crawler/bot.
const CRAWLER_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"

// Parse og:image, og:title, etc. + twitter card + <title> + favicon manually.
// Replaces unfurl.js yang crash karena node-fetch v3 ESM vs unfurl.js CommonJS.
function resolveUrl(maybeUrl, base) {
    if (!maybeUrl) return null
    try { return new URL(maybeUrl, base).toString() } catch { return null }
}

async function linkPreview(url) {
    const res = await fetch(url, {
        headers: {
            "user-agent": CRAWLER_UA,
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) throw new Error(`Gagal fetch URL (HTTP ${res.status})`)
    const html = await res.text()
    const finalUrl = res.url || url
    const $ = cheerio.load(html)

    const metaProp = (name) => $(`meta[property="${name}"]`).attr("content") || $(`meta[name="${name}"]`).attr("content") || null

    const ogTitle = metaProp("og:title")
    const ogDescription = metaProp("og:description")
    const ogImage = resolveUrl(metaProp("og:image") || metaProp("og:image:url"), finalUrl)
    const ogSiteName = metaProp("og:site_name")
    const ogType = metaProp("og:type")

    const twTitle = metaProp("twitter:title")
    const twDescription = metaProp("twitter:description")
    const twImage = resolveUrl(metaProp("twitter:image"), finalUrl)
    const twCard = metaProp("twitter:card")

    const docTitle = $("title").first().text().trim() || null
    const metaDesc = $('meta[name="description"]').attr("content") || null
    const faviconRel = $('link[rel="icon"]').attr("href") || $('link[rel="shortcut icon"]').attr("href") || $('link[rel="apple-touch-icon"]').attr("href")
    const favicon = resolveUrl(faviconRel, finalUrl)

    return {
        url: finalUrl,
        title: ogTitle || twTitle || docTitle || null,
        description: ogDescription || twDescription || metaDesc || null,
        image: ogImage || twImage || null,
        siteName: ogSiteName || null,
        type: ogType || null,
        twitterCard: twCard || null,
        favicon,
    }
}

export default {
    route: {
        method: "get",
        path: "/tools/linkpreview",
        auth: false,
        tags: ["Tools"],
        summary: "Preview metadata dari sebuah link (unfurl)",
        description:
            "Mengambil metadata Open Graph / Twitter Card dari sebuah URL (judul, deskripsi, thumbnail, favicon) untuk keperluan preview link. Mendukung YouTube, Facebook publik, dan situs umum lainnya. Catatan: nama penulis/poster umumnya tidak tersedia lewat metadata. URL thumbnail Facebook (fbcdn) memiliki masa kedaluwarsa.",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL yang ingin di-preview",
                schema: { type: "string", example: "https://www.youtube.com" },
            },
        ],
        responses: {
            "200": {
                description: "Berhasil",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean", example: true },
                                result: {
                                    type: "object",
                                    properties: {
                                        url: { type: "string" },
                                        title: { type: "string" },
                                        description: { type: "string" },
                                        image: { type: "string" },
                                        siteName: { type: "string" },
                                        type: { type: "string" },
                                        favicon: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            "400": { description: "URL tidak valid" },
            "500": { description: "Kesalahan server" },
        },
    },

    handler: async (req, res) => {
        const { url } = req.query
        if (!url || !/^https?:\/\//i.test(url)) {
            return res.status(400).json({ ok: false, error: "URL tidak valid" })
        }
        try {
            const result = await linkPreview(url)
            res.json({ ok: true, result })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

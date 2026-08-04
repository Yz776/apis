// /downloader/jj-capcut — CapCut template downloader/generator
// Scrapes CapCut template page to extract video URL, metadata, and stats
import axios from "axios"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

async function fetchCapcutPage(url) {
    const { data, status } = await axios.get(url, {
        headers: {
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
        },
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: () => true,
    })
    if (status >= 400) {
        throw new Error(`CapCut returned HTTP ${status}`)
    }
    return data
}

function extractTemplateDetail(html) {
    // The template data lives inside a JSON state blob embedded in <script> tags
    // Pattern: "templateDetail":{...}
    const patterns = [
        /"templateDetail"\s*:\s*(\{[^]*?(?:"author"\s*:(?:null|\{[^]*?\}))[^]*?\})\s*,\s*"templateTagInfo"/,
        /"templateDetail"\s*:\s*(\{[^]*?\})\s*,\s*"(?:templateTagInfo|templateList|relatedTemplates)"/,
        /"templateDetail"\s*:\s*(\{.*?\})\s*,\s*"routerInfo"/,
        /"templateDetail"\s*:\s*(\{[^}]*\})\s*,\s*"loadingStatus"/,
    ]

    for (const p of patterns) {
        const m = html.match(p)
        if (m && m[1]) {
            try {
                const raw = m[1]
                    .replace(/\u002F/g, "/")
                    .replace(/\u0026/g, "&")
                    .replace(/\u003C/g, "<")
                    .replace(/\u003E/g, ">")
                return JSON.parse(raw)
            } catch {
                continue
            }
        }
    }

    // Fallback: extract using a balanced-brace parser
    const start = html.indexOf('"templateDetail":')
    if (start === -1) return null
    const objStart = html.indexOf("{", start)
    if (objStart === -1) return null

    let depth = 0
    let inStr = false
    let escape = false
    let end = -1
    for (let i = objStart; i < html.length; i++) {
        const ch = html[i]
        if (escape) { escape = false; continue }
        if (ch === "\\") { escape = true; continue }
        if (ch === '"') { inStr = !inStr; continue }
        if (inStr) continue
        if (ch === "{") depth++
        else if (ch === "}") {
            depth--
            if (depth === 0) { end = i; break }
        }
    }
    if (end === -1) return null

    const raw = html.slice(objStart, end + 1)
        .replace(/\u002F/g, "/")
        .replace(/\u0026/g, "&")
        .replace(/\u003C/g, "<")
        .replace(/\u003E/g, ">")

    try { return JSON.parse(raw) } catch { return null }
}

function extractOgMeta(html) {
    const meta = {}
    const re = /<meta[^>]*property="og:([^"]+)"[^>]*content="([^"]*)"[^>]*>/g
    let m
    while ((m = re.exec(html)) !== null) {
        meta[m[1]] = m[2]
    }
    // Also try twitter: variants
    const re2 = /<meta[^>]*name="twitter:([^"]+)"[^>]*content="([^"]*)"[^>]*>/g
    while ((m = re2.exec(html)) !== null) {
        if (!meta[m[1]]) meta[m[1]] = m[2]
    }
    return meta
}

function normalizeUrl(input) {
    let url = String(input || "").trim()
    if (!url) return null
    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url
    }
    // Accept www.capcut.com or capcut.com
    if (!/(?:^|\.)(?:capcut\.com|capcut\.id|capcut\.tv|capcut\.io)\//i.test(url)) {
        return null
    }
    return url
}

async function jjCapcut(inputUrl) {
    const url = normalizeUrl(inputUrl)
    if (!url) {
        throw new Error("URL tidak valid. Harus URL CapCut (capcut.com/t/<id> atau capcut.com/share/<id>)")
    }

    const html = await fetchCapcutPage(url)
    const detail = extractTemplateDetail(html)
    const og = extractOgMeta(html)

    if (!detail && !og?.title) {
        throw new Error("Tidak dapat mengekstrak data template CapCut. Pastikan URL benar dan template masih tersedia.")
    }

    // Combine data sources
    const title = detail?.title || og?.title?.replace(/^CapCut template:\s*/, "") || null
    const templateId = detail?.templateId || null
    const description = detail?.desc || og?.description || null
    const videoUrl = detail?.videoUrl && !detail.videoUrl.includes("cc_landing/video_en2.mp4")
        ? detail.videoUrl
        : (og?.video ? (og.video.url || og.video.secure_url || og.video) : null)
    const coverUrl = detail?.coverUrl && !detail.coverUrl.includes("default_tool/poster_en.jpg")
        ? detail.coverUrl
        : (og?.image || null)
    const author = detail?.author
        ? {
              name: detail.author.nickname || detail.author.name || null,
              user_id: detail.author.uid || detail.author.userId || null,
              avatar: detail.author.avatar_url || detail.author.avatarUrl || null,
              region: detail.author.region || null,
          }
        : null

    const duration = detail?.templateDuration ? Number(detail.templateDuration) : null
    const width = detail?.videoWidth ? Number(detail.videoWidth) : null
    const height = detail?.videoHeight ? Number(detail.videoHeight) : null
    const ratio = detail?.videoRatio || (width && height ? `${width}:${height}` : null)

    const stats = {
        views: detail?.playAmount ? Number(detail.playAmount) : null,
        uses: detail?.usageAmount ? Number(detail.usageAmount) : null,
        likes: detail?.likeAmount ? Number(detail.likeAmount) : null,
        comments: detail?.commentAmount ? Number(detail.commentAmount) : null,
        segments: detail?.segmentAmount ? Number(detail.segmentAmount) : null,
    }

    const result = {
        template_id: templateId,
        url,
        title,
        description,
        author,
        video_url: videoUrl,
        cover_url: coverUrl,
        duration_ms: duration,
        dimensions: width && height ? { width, height } : null,
        ratio,
        language: detail?.templateLanguage || null,
        tag: detail?.tagTitle || null,
        stats,
        source: "capcut.com",
    }

    // Remove null/empty values for cleaner response
    const cleaned = {}
    for (const [k, v] of Object.entries(result)) {
        if (v !== null && v !== undefined && v !== "") cleaned[k] = v
    }
    return cleaned
}

export default {
    route: {
        method: "get",
        path: "/downloader/jj-capcut",
        auth: false,
        tags: ["Downloader"],
        summary: "JJ CapCut Generator — download CapCut template",
        description: "Ekstrak video URL, cover, statistik (views/uses/likes), dan metadata dari halaman template CapCut (capcut.com/t/<id> atau capcut.com/share/<id>). Mendukung template video dan template dengan musik.",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL CapCut template (cth: https://www.capcut.com/t/XXXXXXXX/)",
                schema: { type: "string", example: "https://www.capcut.com/t/7234567890123456789/" },
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
                                        template_id: { type: "string" },
                                        url: { type: "string" },
                                        title: { type: "string" },
                                        description: { type: "string" },
                                        author: { type: "object" },
                                        video_url: { type: "string" },
                                        cover_url: { type: "string" },
                                        duration_ms: { type: "integer" },
                                        dimensions: { type: "object" },
                                        ratio: { type: "string" },
                                        language: { type: "string" },
                                        tag: { type: "string" },
                                        stats: { type: "object" },
                                        source: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            "400": { description: "URL tidak valid" },
            "500": { description: "Kesalahan server atau template tidak ditemukan" },
        },
    },

    handler: async (req, res) => {
        const { url } = req.query
        if (!url) {
            return res.status(400).json({
                ok: false,
                error: "url wajib diisi",
                hint: "Contoh: /downloader/jj-capcut?url=https://www.capcut.com/t/7234567890123456789/",
            })
        }
        // Validate URL is from CapCut before making any request
        const normalized = normalizeUrl(url)
        if (!normalized) {
            return res.status(400).json({
                ok: false,
                error: "URL tidak valid. Harus URL CapCut (capcut.com/t/<id> atau capcut.com/share/<id>)",
                received: url,
            })
        }
        try {
            const result = await jjCapcut(url)
            if (!result.video_url && !result.title) {
                return res.status(404).json({
                    ok: false,
                    error: "Template tidak ditemukan atau telah dihapus. Periksa kembali URL CapCut Anda.",
                    provided_url: url,
                })
            }
            res.json({ ok: true, result })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

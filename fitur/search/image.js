// /search/image — web image search via Bing Images.
//
// Catatan backend (2026-09): Google Images kini menyajikan halaman JS-only
// untuk request server-side (shell "enablejs", ichunk async 404), sehingga
// scraping langsung tidak bisa lagi. Bing Images masih menyajikan HTML yang
// bisa diparsing dan hasilnya setara (thumbnail + gambar full-res + judul +
// halaman sumber), jadi endpoint ini memakai Bing sebagai backend.
import * as cheerio from "cheerio"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

const SAFE_MAP = { on: "strict", moderate: "moderate", off: "off" }

async function searchImages(query, { limit = 20, safe = "moderate" } = {}) {
    const url = new URL("https://www.bing.com/images/search")
    url.searchParams.set("q", query)
    url.searchParams.set("first", "1")
    url.searchParams.set("count", String(Math.min(100, Math.max(10, limit))))
    url.searchParams.set("adlt", SAFE_MAP[safe] || "moderate")

    const res = await fetch(url, {
        headers: {
            "user-agent": UA,
            "accept": "text/html,application/xhtml+xml",
            "accept-language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(25_000),
    })
    if (!res.ok) throw new Error(`Bing HTTP ${res.status}`)
    const html = await res.text()
    const $ = cheerio.load(html)

    const results = []
    $("a.iusc[m]").each((_, el) => {
        if (results.length >= limit) return false
        let meta
        try { meta = JSON.parse($(el).attr("m")) } catch { return }
        const murl = meta.murl || ""
        const turl = meta.turl || ""
        if (!murl && !turl) return
        results.push({
            image: murl || null,          // full-res image URL
            thumbnail: turl || null,      // Bing CDN thumbnail
            title: (meta.t || "").trim() || null,
            source: meta.purl || null,    // page containing the image
            width: meta.mw || null,
            height: meta.mh || null,
        })
    })
    if (!results.length) throw new Error("Tidak ada hasil — query terlalu spesifik atau Bing membatasi request")
    return { query, total: results.length, results }
}

export default {
    route: {
        method: "get",
        path: "/search/image",
        auth: false,
        tags: ["Search"],
        summary: "Cari gambar (web image search via Bing)",
        description:
            "Pencarian gambar via Bing Images: kembalikan thumbnail, URL gambar full-res, judul, dan halaman sumber. " +
            "Catatan: Google menutup scraping server-side (JS-only), jadi backend memakai Bing — hasil setara untuk kebutuhan image search.",
        parameters: [
            { name: "query", in: "query", required: true, description: "Kata kunci gambar", schema: { type: "string", example: "kucing lucu" } },
            { name: "limit", in: "query", required: false, description: "Jumlah hasil (1–50)", schema: { type: "integer", default: 20 } },
            { name: "safe", in: "query", required: false, description: "SafeSearch: on, moderate (default), off", schema: { type: "string", enum: ["on", "moderate", "off"], default: "moderate" } },
        ],
        responses: { "200": { description: "Daftar hasil gambar" }, "400": { description: "Parameter tidak valid" }, "500": { description: "Kesalahan server" } },
    },

    handler: async (req, res) => {
        const query = String(req.query.query || "").trim()
        if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi" })
        const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 20))
        const safe = SAFE_MAP[String(req.query.safe || "moderate").toLowerCase()] ? String(req.query.safe).toLowerCase() : "moderate"
        try {
            const result = await searchImages(query, { limit, safe })
            res.json({ ok: true, ...result })
        } catch (e) {
            res.status(500).json({ ok: false, error: e?.message || String(e) })
        }
    },
}

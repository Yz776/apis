// /search/unsplash — Pencarian Gambar via Wikimedia Commons (tanpa API key)
//
// Catatan (2026-09): Unsplash menutup akses tanpa access key (401 "OAuth error"),
// dan key gratis hanya 50 req/jam. Wikimedia Commons menyediakan pencarian gambar
// publik tanpa autentikasi dengan kuota longgar, jadi endpoint ini memakai
// Commons sebagai backend. Path tetap /search/unsplash agar tidak mematahkan
// konsumen yang sudah memakai route ini.
const UA = "Kangwifi-API/1.0 (https://github.com/Yz776/apis)"

export default {
    route: {
        method: "get",
        path: "/search/unsplash",
        auth: false,
        tags: ["Search", "Media"],
        summary: "Pencarian Gambar (Wikimedia Commons)",
        description:
            "Cari foto & ilustrasi dari Wikimedia Commons tanpa API key. " +
            "Catatan: Unsplash kini menolak request tanpa access key, jadi backend memakai Wikimedia Commons (hasil publik, bebas pakai dengan atribusi).",
        parameters: [
            { name: "query", in: "query", required: true, description: "Kata kunci pencarian", schema: { type: "string", example: "mountain landscape" } },
            { name: "per_page", in: "query", required: false, description: "Jumlah hasil (1-30)", schema: { type: "integer", default: 10 } },
            { name: "orientation", in: "query", required: false, description: "Diabaikan (dipertahankan untuk kompatibilitas)", schema: { type: "string", enum: ["landscape", "portrait", "squarish"] } },
        ],
        responses: { "200": { description: "Hasil gambar" }, "400": { description: "Parameter tidak valid" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const { query, per_page = 10 } = req.query
        if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi" })
        const limit = Math.min(30, Math.max(1, parseInt(per_page, 10) || 10))
        const url = new URL("https://commons.wikimedia.org/w/api.php")
        url.searchParams.set("action", "query")
        url.searchParams.set("format", "json")
        url.searchParams.set("generator", "search")
        url.searchParams.set("gsrsearch", `filetype:bitmap ${query}`)
        url.searchParams.set("gsrnamespace", "6")
        url.searchParams.set("gsrlimit", String(limit))
        url.searchParams.set("prop", "imageinfo")
        url.searchParams.set("iiprop", "url|size|mime|extmetadata")
        url.searchParams.set("iiurlwidth", "640")
        try {
            const res2 = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(15_000) })
            if (!res2.ok) return res.status(502).json({ ok: false, error: `Wikimedia HTTP ${res2.status}` })
            const data = await res2.json()
            const pages = Object.values(data.query?.pages || {})
            const results = pages
                .filter(p => p.imageinfo?.[0]?.url)
                .map(p => {
                    const info = p.imageinfo[0]
                    const meta = info.extmetadata || {}
                    return {
                        id: p.pageid,
                        description: meta.ImageDescription?.value?.replace(/<[^>]+>/g, "").trim() || p.title,
                        urls: { raw: info.url, full: info.url, regular: info.thumburl || info.url, small: info.thumburl || info.url, thumb: info.thumburl || info.url },
                        photographer: { name: meta.Artist?.value?.replace(/<[^>]+>/g, "").trim() || null, profile: info.descriptionurl },
                        license: meta.LicenseShortName?.value || null,
                        width: info.width,
                        height: info.height,
                    }
                })
            if (!results.length) return res.status(404).json({ ok: false, error: "Tidak ada hasil untuk query tersebut" })
            res.json({ ok: true, source: "Wikimedia Commons", total: results.length, results })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

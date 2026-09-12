// /search/appstore — aplikasi & media search via iTunes/Apple Search API (no key).
// Added 2026-09-12 to replace the dead apkmody APK search.
import axios from "axios"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"

export default {
  route: {
    method: "get",
    path: "/search/appstore",
    auth: false,
    tags: ["Search"],
    summary: "Cari aplikasi (Apple App Store)",
    description:
      "Mencari aplikasi iOS/macOS memakai Apple iTunes Search API. Gratis, tanpa API key, cepat. `media=software` (default) untuk aplikasi.",
    parameters: [
      { name: "query", in: "query", required: true, description: "Kata kunci", schema: { type: "string" } },
      { name: "country", in: "query", required: false, description: "Kode negara (id, us, …)", schema: { type: "string", default: "id" } },
      { name: "media", in: "query", required: false, description: "software (default), movie, musicVideo, podcast, …", schema: { type: "string", default: "software" } },
      { name: "limit", in: "query", required: false, description: "Jumlah hasil (1–50)", schema: { type: "integer", default: 10 } },
    ],
    responses: { "200": { description: "Hasil" }, "400": { description: "Param kurang" }, "500": { description: "Server error" } },
  },

  handler: async (req, res) => {
    const query = String(req.query.query || "").trim()
    if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi" })
    const country = /^[a-z]{2}$/i.test(String(req.query.country || "")) ? String(req.query.country).toLowerCase() : "id"
    const media = /^[a-z]+$/i.test(String(req.query.media || "")) ? String(req.query.media).toLowerCase() : "software"
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 10))
    try {
      const { data } = await axios.get("https://itunes.apple.com/search", {
        params: { term: query, country, media, limit },
        headers: { "user-agent": UA },
        timeout: 30000,
      })
      const results = (data?.results || []).map(r => ({
        name: r.trackName || r.collectionName || null,
        id: r.trackId || r.artistId || null,
        seller: r.sellerName || r.artistName || null,
        price: r.formattedPrice || null,
        currency: r.currency || null,
        genre: r.primaryGenreName || null,
        icon: r.artworkUrl100 || r.artworkUrl60 || null,
        url: r.trackViewUrl || r.artistViewUrl || null,
        score: r.averageUserRating || null,
        ratingCount: r.userRatingCount || null,
      }))
      res.json({ ok: true, query, country, media, total: results.length, results })
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || String(e) })
    }
  },
}

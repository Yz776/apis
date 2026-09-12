// /search/wikipedia — Wikipedia search (MediaWiki Action API, any language).
// Added 2026-09-12 (was a stale entry in endpoints.json with no backing file).
import axios from "axios"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"

export default {
  route: {
    method: "get",
    path: "/search/wikipedia",
    auth: false,
    tags: ["Search"],
    summary: "Pencarian Wikipedia",
    description:
      "Cari artikel Wikipedia dari berbagai bahasa (default id). Kembalikan judul, snippet, URL, dan ringkasan halaman pertama.",
    parameters: [
      { name: "q", in: "query", required: true, description: "Kata kunci pencarian", schema: { type: "string" } },
      { name: "lang", in: "query", required: false, description: "Kode bahasa (id, en, ja, …)", schema: { type: "string", default: "id" } },
      { name: "limit", in: "query", required: false, description: "Jumlah hasil (1–20)", schema: { type: "integer", default: 5 } },
    ],
    responses: { "200": { description: "Hasil" }, "400": { description: "Param kurang" }, "500": { description: "Server error" } },
  },

  handler: async (req, res) => {
    const q = String(req.query.q || "").trim()
    if (!q) return res.status(400).json({ ok: false, error: "q wajib diisi" })
    const lang = /^[a-z]{1,3}(-[a-z]+)*$/i.test(String(req.query.lang || "")) ? String(req.query.lang).toLowerCase() : "id"
    const limit = Math.max(1, Math.min(20, parseInt(req.query.limit, 10) || 5))
    const api = `https://${lang}.wikipedia.org/w/api.php`
    try {
      const { data } = await axios.get(api, {
        params: { action: "query", list: "search", srsearch: q, srlimit: limit, format: "json", origin: "*" },
        headers: { "user-agent": UA },
        timeout: 30000,
      })
      const hits = data?.query?.search || []
      const results = hits.map(h => ({
        title: h.title,
        snippet: String(h.snippet || "").replace(/<[^>]+>/g, ""),
        pageid: h.pageid,
        url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(h.title).replace(/%20/g, "_")}`,
      }))
      res.json({ ok: true, query: q, lang, total: data?.query?.searchinfo?.totalhits ?? results.length, results })
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || String(e) })
    }
  },
}

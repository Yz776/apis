// /info/crossref — Crossref scholarly works search
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/crossref",
        auth: false,
        tags: ["Info"],
        summary: "Crossref scholarly works search",
        description: "Cari publikasi ilmiah via Crossref API. Free, no key.",
        parameters: [
            { name: "q", in: "query", required: true, description: "Query pencarian", schema: { type: "string", example: "climate change" } },
            { name: "limit", in: "query", required: false, description: "Maksimum hasil (default 10, max 50)", schema: { type: "integer", default: 10 } },
        ],
        responses: { "200": { description: "Hasil pencarian Crossref" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const q = String(req.query.q || "").trim()
        if (!q) return res.status(400).json({ ok: false, error: "q wajib diisi" })
        try {
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10))
            const { data } = await axios.get("https://api.crossref.org/works", {
                params: { query: q, rows: limit },
                headers: { "User-Agent": "KangwifiAPI/1.0 (mailto:admin@kangwifi.eu.org)" },
                timeout: 15000,
            })
            const works = (data.message?.items || []).map(w => ({
                doi: w.DOI,
                title: w.title?.[0] || null,
                author: (w.author || []).map(a => `${a.given || ""} ${a.family || ""}`.trim()),
                container_title: w["container-title"]?.[0] || null,
                publisher: w.publisher,
                published: w.published?.["date-parts"]?.[0]?.join("-") || null,
                type: w.type,
                issn: w.ISSN?.[0] || null,
                url: w.URL,
                citation_count: w["is-referenced-by-count"] || 0,
                abstract: w.abstract ? w.abstract.replace(/<[^>]+>/g, "") : null,
            }))
            res.json({
                ok: true,
                total_results: data.message?.["total-results"] || 0,
                returned: works.length,
                works,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

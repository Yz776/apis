// /search/github-code — Pencarian Repositori GitHub (Public Search API)
//
// Catatan (2026-09): endpoint /search/code GitHub kini wajib autentikasi
// (401 "Requires authentication") dan kuota tanpa token hanya 10 req/menit.
// /search/repositories tetap publik tanpa token (10 req/menit, 30 dengan token),
// jadi endpoint ini beralih ke pencarian repositori publik.
const UA = "Kangwifi-API/1.0 (https://github.com/Yz776/apis)"

export default {
    route: {
        method: "get",
        path: "/search/github-code",
        auth: false,
        tags: ["Search", "Dev"],
        summary: "Pencarian Repositori GitHub",
        description:
            "Cari repositori publik di GitHub (nama, deskripsi, bahasa, stars). " +
            "Catatan: pencarian kode (/search/code) kini wajib token, jadi endpoint ini memakai pencarian repositori publik yang tidak butuh autentikasi.",
        parameters: [
            { name: "q", in: "query", required: true, description: "Query pencarian (contoh: 'react hooks language:javascript')", schema: { type: "string", example: "elysia language:javascript" } },
            { name: "per_page", in: "query", required: false, description: "Jumlah hasil (max 50)", schema: { type: "integer", default: 10 } },
            { name: "page", in: "query", required: false, description: "Halaman", schema: { type: "integer", default: 1 } },
            { name: "sort", in: "query", required: false, description: "stars | forks | updated (kosong = relevansi)", schema: { type: "string", enum: ["stars", "forks", "updated"] } },
            { name: "order", in: "query", required: false, description: "asc | desc", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
        ],
        responses: { "200": { description: "Hasil pencarian repositori" }, "403": { description: "Rate limit" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const { q, per_page = 10, page = 1, sort, order = "desc" } = req.query
        if (!q) return res.status(400).json({ ok: false, error: "q wajib diisi" })
        const url = new URL("https://api.github.com/search/repositories")
        url.searchParams.set("q", q)
        url.searchParams.set("per_page", String(Math.min(50, Math.max(1, parseInt(per_page, 10) || 10))))
        url.searchParams.set("page", String(page))
        if (sort) url.searchParams.set("sort", sort)
        url.searchParams.set("order", order)
        try {
            const res2 = await fetch(url, {
                headers: { "user-agent": UA, accept: "application/vnd.github+json" },
                signal: AbortSignal.timeout(15_000),
            })
            if (res2.status === 403 || res2.status === 429) return res.status(403).json({ ok: false, error: "Rate limit GitHub (10 req/min tanpa token)" })
            if (res2.status === 401) return res.status(502).json({ ok: false, error: "GitHub menolak request (butuh token)" })
            const data = await res2.json()
            const results = (data.items || []).map(item => ({
                name: item.full_name,
                description: item.description,
                url: item.html_url,
                language: item.language,
                stars: item.stargazers_count,
                forks: item.forks_count,
                updated: item.updated_at,
            }))
            res.json({ ok: true, source: "GitHub Repository Search", total_count: data.total_count, items: results })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

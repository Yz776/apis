// /search/stackoverflow — Pencarian Stack Overflow (Stack Exchange API v2.3)
// Sumber: https://api.stackexchange.com/docs
// Catatan: No key = 300 req/24h per IP; dengan key = 10k req/24h
export default {
    route: {
        method: "get",
        path: "/search/stackoverflow",
        auth: false,
        tags: ["Search", "Dev"],
        summary: "Pencarian Stack Overflow",
        description: "Cari pertanyaan & jawaban di Stack Overflow. No key: 300 req/24h per IP. Dengan key: 10k req/24h.",
        parameters: [
            { name: "q", in: "query", required: true, description: "Kata kunci pencarian", schema: { type: "string", example: "react hooks useEffect" } },
            { name: "tagged", in: "query", required: false, description: "Tag (contoh: javascript,reactjs)", schema: { type: "string" } },
            { name: "sort", in: "query", required: false, description: "relevance | activity | votes | creation", schema: { type: "string", enum: ["relevance", "activity", "votes", "creation"], default: "relevance" } },
            { name: "order", in: "query", required: false, description: "asc | desc", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
            { name: "pagesize", in: "query", required: false, description: "Jumlah hasil (max 100)", schema: { type: "integer", default: 10 } },
            { name: "page", in: "query", required: false, description: "Halaman", schema: { type: "integer", default: 1 } },
            { name: "key", in: "query", required: false, description: "Stack Apps API key (opsional, bisa via env STACKAPPS_KEY)", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Hasil pencarian" }, "400": { description: "Parameter tidak valid" }, "429": { description: "Rate limit" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const { q, tagged, sort = "relevance", order = "desc", pagesize = 10, page = 1, key = process.env.STACKAPPS_KEY } = req.query
        if (!q) return res.status(400).json({ ok: false, error: "q wajib diisi" })
        const url = new URL("https://api.stackexchange.com/2.3/search/advanced")
        url.searchParams.set("order", order)
        url.searchParams.set("sort", sort)
        url.searchParams.set("q", q)
        url.searchParams.set("site", "stackoverflow")
        url.searchParams.set("pagesize", String(Math.min(100, Math.max(1, pagesize))))
        url.searchParams.set("page", String(page))
        if (tagged) url.searchParams.set("tagged", tagged)
        if (key) url.searchParams.set("key", key)
        try {
            const res2 = await fetch(url, { headers: { "user-agent": "Kangwifi-API/1.0" }, signal: AbortSignal.timeout(15_000) })
            const data = await res2.json()
            if (data.error_id) return res.status(400).json({ ok: false, error: data.error_message })
            const results = (data.items || []).map(item => ({
                question_id: item.question_id,
                title: item.title,
                link: item.link,
                score: item.score,
                answer_count: item.answer_count,
                is_answered: item.is_answered,
                tags: item.tags,
                creation_date: item.creation_date,
                owner: { display_name: item.owner?.display_name, link: item.owner?.link },
            }))
            res.json({ ok: true, source: "Stack Exchange API", has_more: data.has_more, quota_remaining: data.quota_remaining, results })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}
// /info/tv-maze — TV Maze show search
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/tv-maze",
        auth: false,
        tags: ["Info"],
        summary: "TV show search (TV Maze)",
        description: "Cari acara TV via TV Maze API (free, no key).",
        parameters: [
            { name: "q", in: "query", required: true, description: "Query pencarian", schema: { type: "string", example: "breaking bad" } },
            { name: "limit", in: "query", required: false, description: "Maksimum hasil (default 10)", schema: { type: "integer", default: 10 } },
        ],
        responses: { "200": { description: "Hasil pencarian" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const q = String(req.query.q || "").trim()
        if (!q) return res.status(400).json({ ok: false, error: "q wajib diisi" })
        try {
            const { data } = await axios.get(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`, { timeout: 15000 })
            const limit = parseInt(req.query.limit) || 10
            const shows = data.slice(0, limit).map(item => {
                const s = item.show
                return {
                    id: s.id,
                    name: s.name,
                    type: s.type,
                    language: s.language,
                    genres: s.genres || [],
                    status: s.status,
                    runtime: s.runtime,
                    average_runtime: s.averageRuntime,
                    premiered: s.premiered,
                    ended: s.ended,
                    official_site: s.officialSite,
                    schedule: s.schedule,
                    rating: s.rating?.average || null,
                    weight: s.weight,
                    network: s.network?.name || null,
                    country: s.network?.country?.name || null,
                    image: s.image?.original || s.image?.medium || null,
                    summary: s.summary ? s.summary.replace(/<[^>]+>/g, "") : null,
                    score: item.score,
                }
            })
            res.json({
                ok: true,
                total_found: data.length,
                returned: shows.length,
                shows,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

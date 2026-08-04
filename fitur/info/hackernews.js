// /info/hackernews — Hacker News top stories
import axios from "axios"

export default {
    route: {
        method: "get",
        path: "/info/hackernews",
        auth: false,
        tags: ["Info"],
        summary: "Hacker News top stories",
        description: "Mengambil N top stories dari Hacker News (Y Combinator). Setiap item berisi title, url, score, author, komentar.",
        parameters: [
            { name: "limit", in: "query", required: false, description: "Jumlah item (1-30, default 10)", schema: { type: "integer", default: 10, example: 5 } },
        ],
        responses: { "200": { description: "Top stories" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        let limit = parseInt(req.query.limit, 10) || 10
        if (limit < 1) limit = 1
        if (limit > 30) limit = 30
        try {
            const { data: ids } = await axios.get("https://hacker-news.firebaseio.com/v0/topstories.json", { timeout: 15000 })
            const top = ids.slice(0, limit)
            const items = await Promise.all(top.map(id =>
                axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { timeout: 15000 }).then(r => r.data)
            ))
            const stories = items.filter(s => s && !s.deleted && !s.dead).map(s => ({
                id: s.id,
                title: s.title,
                url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
                score: s.score,
                author: s.by,
                comments: s.descendants || 0,
                time: new Date(s.time * 1000).toISOString(),
                hn_url: `https://news.ycombinator.com/item?id=${s.id}`,
            }))
            res.json({ ok: true, count: stories.length, stories })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

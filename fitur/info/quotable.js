// /info/quotable — Random quote (ZenQuotes — quotable.io is dead)
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/quotable",
        auth: false,
        tags: ["Info"],
        summary: "Random quote (ZenQuotes)",
        description: "Kutipan acak dari penulis terkenal. Sumber: zenquotes.io (free, no key).",
        parameters: [
            { name: "author", in: "query", required: false, description: "Filter by author name (optional)", schema: { type: "string" } },
            { name: "tags", in: "query", required: false, description: "(legacy, ignored)", schema: { type: "string" } },
            { name: "maxLength", in: "query", required: false, description: "Panjang maksimum (char, optional)", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Quote" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const url = req.query.author
                ? `https://zenquotes.io/api/quotes/${encodeURIComponent(req.query.author)}`
                : "https://zenquotes.io/api/random"
            const { data } = await axios.get(url, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } })
            // ZenQuotes returns array; for /random it's array of 1 object
            const quotes = Array.isArray(data) ? data : [data]
            const q = quotes[0] || {}
            let content = q.q || q.content || ""
            const author = q.a || q.author || "Unknown"
            if (req.query.maxLength && content.length > parseInt(req.query.maxLength)) {
                content = content.slice(0, parseInt(req.query.maxLength)) + "…"
            }
            res.json({
                ok: true,
                content,
                author,
                length: content.length,
                source: "zenquotes.io",
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

// /info/breaking-bad — Breaking Bad quotes
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/breaking-bad",
        auth: false,
        tags: ["Info"],
        summary: "Breaking Bad quotes",
        description: "Kutipan acak dari Breaking Bad. Sumber: breakingbadquotes.xyz.",
        parameters: [
            { name: "count", in: "query", required: false, description: "Jumlah quote (default 1, max 50)", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "Quote" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const count = Math.min(50, Math.max(1, parseInt(req.query.count) || 1))
            const { data } = await axios.get(`https://api.breakingbadquotes.xyz/v1/quotes/${count}`, { timeout: 15000 })
            const quotes = (Array.isArray(data) ? data : [data]).map(q => ({
                quote: q.quote,
                author: q.author,
            }))
            res.json({
                ok: true,
                count: quotes.length,
                quotes,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

// /info/quotable — Random quote (ZenQuotes + dummyjson fallback)
// quotable.io is DEAD — using zenquotes.io as primary, dummyjson.com as fallback
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/quotable",
        auth: false,
        tags: ["Info"],
        summary: "Random quote",
        description: "Kutipan acak dari penulis terkenal. Sumber utama: zenquotes.io. Fallback: dummyjson.com bila gagal.",
        parameters: [
            { name: "author", in: "query", required: false, description: "Filter by author name (optional, ZenQuotes only)", schema: { type: "string" } },
            { name: "tags", in: "query", required: false, description: "(legacy, ignored)", schema: { type: "string" } },
            { name: "maxLength", in: "query", required: false, description: "Panjang maksimum (char, optional)", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Quote" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            let content = ""
            let author = "Unknown"
            let source = "zenquotes.io"

            // Primary: ZenQuotes
            try {
                const url = req.query.author
                    ? `https://zenquotes.io/api/quotes/${encodeURIComponent(req.query.author)}`
                    : "https://zenquotes.io/api/random"
                const { data, status } = await axios.get(url, {
                    timeout: 7000,
                    headers: { "User-Agent": "Mozilla/5.0" },
                    validateStatus: () => true,
                })
                if (status === 200 && data) {
                    const quotes = Array.isArray(data) ? data : [data]
                    const q = quotes[0] || {}
                    content = q.q || q.content || ""
                    author = q.a || q.author || "Unknown"
                } else {
                    throw new Error(`ZenQuotes returned ${status}`)
                }
            } catch {
                // Fallback: dummyjson.com
                source = "dummyjson.com"
                const { data: dj, status } = await axios.get("https://dummyjson.com/quotes/random", {
                    timeout: 7000,
                    validateStatus: () => true,
                })
                if (status === 200 && dj?.quote) {
                    content = dj.quote
                    author = dj.author || "Unknown"
                } else {
                    throw new Error("Semua upstream gagal")
                }
            }

            if (req.query.maxLength && content.length > parseInt(req.query.maxLength)) {
                content = content.slice(0, parseInt(req.query.maxLength)) + "…"
            }

            res.json({
                ok: true,
                content,
                author,
                length: content.length,
                source,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

// /info/quotable — Random quote (Quotable)
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/quotable",
        auth: false,
        tags: ["Info"],
        summary: "Random quote (Quotable)",
        description: "Kutipan acak dari penulis terkenal. Sumber: quotable.io (free, no key).",
        parameters: [
            { name: "author", in: "query", required: false, description: "Filter by author (slug, cth: einstein)", schema: { type: "string" } },
            { name: "tags", in: "query", required: false, description: "Filter by tag (cth: love,famous-quotes)", schema: { type: "string" } },
            { name: "maxLength", in: "query", required: false, description: "Panjang maksimum (char)", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Quote" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const params = {}
            if (req.query.author) params.author = req.query.author
            if (req.query.tags) params.tags = req.query.tags
            if (req.query.maxLength) params.maxLength = parseInt(req.query.maxLength)
            const { data } = await axios.get("https://api.quotable.io/random", { params, timeout: 15000 })
            res.json({
                ok: true,
                id: data._id,
                content: data.content,
                author: data.author,
                author_slug: data.authorSlug,
                length: data.length,
                tags: data.tags,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

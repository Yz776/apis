// /info/quote — Random quote (dummyjson / quotable)
import axios from "axios"

export default {
    route: {
        method: "get",
        path: "/info/quote",
        auth: false,
        tags: ["Info"],
        summary: "Random quote",
        description: "Kutipan motivasi acak dari penulis terkenal via dummyjson.com.",
        parameters: [],
        responses: { "200": { description: "Quote" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const { data } = await axios.get("https://dummyjson.com/quotes/random", { timeout: 15000 })
            res.json({ ok: true, id: data.id, quote: data.quote, author: data.author })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

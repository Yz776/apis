// /info/dog-facts — random dog facts
export default {
    route: {
        method: "get",
        path: "/info/dog-facts",
        auth: false,
        tags: ["Info"],
        summary: "Random dog facts",
        description: "Fakta anjing acak dari Dog API.",
        parameters: [
            { name: "count", in: "query", required: false, description: "Jumlah fakta (default 1, max 50)", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "Fakta anjing" }, "502": { description: "Upstream error" } },
    },
    handler: async (req, res) => {
        try {
            let count = parseInt(req.query.count, 10) || 1
            if (count < 1) count = 1
            if (count > 50) count = 50
            const url = `https://dog-api.fact.ninja/facts?limit=${count}`
            const r = await fetch(url, { headers: { "Accept": "application/json" } })
            if (!r.ok) return res.status(502).json({ ok: false, error: "Dog API error: " + r.status })
            const data = await r.json()
            res.json({ ok: true, count: data.facts.length, facts: data.facts })
        } catch (e) { res.status(502).json({ ok: false, error: e.message }) }
    },
}

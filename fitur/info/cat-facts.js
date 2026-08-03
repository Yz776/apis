// /info/cat-facts — random cat facts
export default {
    route: {
        method: "get",
        path: "/info/cat-facts",
        auth: false,
        tags: ["Info"],
        summary: "Random cat facts",
        description: "Fakta kucing acak dari Cat Fact API (catfact.ninja).",
        parameters: [
            { name: "count", in: "query", required: false, description: "Jumlah fakta (default 1, max 50)", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "Fakta kucing" }, "502": { description: "Upstream error" } },
    },
    handler: async (req, res) => {
        try {
            let count = parseInt(req.query.count, 10) || 1
            if (count < 1) count = 1
            if (count > 50) count = 50
            const url = count === 1
                ? "https://catfact.ninja/fact"
                : `https://catfact.ninja/facts?limit=${count}`
            const r = await fetch(url, { headers: { "Accept": "application/json" } })
            if (!r.ok) return res.status(502).json({ ok: false, error: "Cat Fact API error: " + r.status })
            const data = await r.json()
            if (count === 1) return res.json({ ok: true, fact: data.fact, length: data.length })
            res.json({ ok: true, count: data.data.length, facts: data.data.map(d => d.fact) })
        } catch (e) { res.status(502).json({ ok: false, error: e.message }) }
    },
}

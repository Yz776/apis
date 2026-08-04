// /info/affirmation — daily affirmation
export default {
    route: {
        method: "get",
        path: "/info/affirmation",
        auth: false,
        tags: ["Info"],
        summary: "Random affirmation",
        description: "Affirmasi positif acak dari affirmation API.",
        parameters: [],
        responses: { "200": { description: "Affirmation" }, "502": { description: "Upstream error" } },
    },
    handler: async (req, res) => {
        try {
            const r = await fetch("https://www.affirmations.dev/", { headers: { "Accept": "application/json" } })
            if (!r.ok) return res.status(502).json({ ok: false, error: "Affirmation API error: " + r.status })
            const data = await r.json()
            res.json({ ok: true, affirmation: data.affirmation })
        } catch (e) { res.status(502).json({ ok: false, error: e.message }) }
    },
}

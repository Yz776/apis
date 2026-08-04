// /info/advice — random advice slip
export default {
    route: {
        method: "get",
        path: "/info/advice",
        auth: false,
        tags: ["Info"],
        summary: "Random advice",
        description: "Saran acak dari Advice Slip API.",
        parameters: [
            { name: "id", in: "query", required: false, description: "ID advice spesifik (jika kosong, random)", schema: { type: "integer", example: 1 } },
        ],
        responses: { "200": { description: "Saran" }, "502": { description: "Upstream error" } },
    },
    handler: async (req, res) => {
        try {
            const id = req.query.id
            const url = id ? `https://api.adviceslip.com/advice/${parseInt(id, 10)}` : "https://api.adviceslip.com/advice"
            const r = await fetch(url, { headers: { "Accept": "application/json" } })
            if (!r.ok) return res.status(502).json({ ok: false, error: "Advice API error: " + r.status })
            const text = await r.text()
            try {
                const data = JSON.parse(text)
                if (data.slip) return res.json({ ok: true, id: data.slip.id, advice: data.slip.advice })
                if (data.message) return res.status(404).json({ ok: false, error: data.message.text })
                return res.json({ ok: true, raw: data })
            } catch { return res.status(502).json({ ok: false, error: "Response tidak valid JSON", raw: text.slice(0, 200) }) }
        } catch (e) { res.status(502).json({ ok: false, error: e.message }) }
    },
}

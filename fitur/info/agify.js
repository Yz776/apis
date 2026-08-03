// /info/agify — predict age from name (agify.io)
export default {
    route: {
        method: "get",
        path: "/info/agify",
        auth: false,
        tags: ["Info"],
        summary: "Predict age from name (agify.io)",
        description: "Prediksi usia berdasarkan nama depan dari agify.io (no API key).",
        parameters: [
            { name: "name", in: "query", required: true, description: "Nama depan", schema: { type: "string", example: "alex" } },
            { name: "country_id", in: "query", required: false, description: "Kode negara ISO 3166-1 alpha-2 (mis. US, ID)", schema: { type: "string", example: "US" } },
        ],
        responses: { "200": { description: "Prediksi usia" }, "502": { description: "Upstream error" } },
    },
    handler: async (req, res) => {
        try {
            const name = String(req.query.name || "").trim()
            if (!name) return res.status(400).json({ ok: false, error: "name wajib diisi" })
            const params = new URLSearchParams({ name })
            if (req.query.country_id) params.set("country_id", String(req.query.country_id).toUpperCase())
            const r = await fetch(`https://api.agify.io?${params}`, { headers: { "Accept": "application/json" } })
            if (!r.ok) return res.status(502).json({ ok: false, error: "Agify error: " + r.status })
            const data = await r.json()
            res.json({ ok: true, ...data })
        } catch (e) { res.status(502).json({ ok: false, error: e.message }) }
    },
}

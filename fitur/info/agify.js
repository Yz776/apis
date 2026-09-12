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
 // agify.io shares a tight free-tier rate limit; retry on 429 with backoff.
 let lastStatus
 for (let attempt = 0; attempt < 3; attempt++) {
 const r = await fetch(`https://api.agify.io?${params}`, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(15000) })
 if (r.ok) { const data = await r.json(); return res.json({ ok: true, ...data }) }
 lastStatus = r.status
 if (r.status === 429) { await new Promise(res => setTimeout(res, 1200 * (attempt + 1))); continue }
 break
 }
 res.status(502).json({ ok: false, error: "Agify error: " + lastStatus + " (rate limited — coba lagi)" })
        } catch (e) { res.status(502).json({ ok: false, error: e.message }) }
    },
}

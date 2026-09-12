// /info/nationalize — Predict nationality from name
export default {
    route: {
        method: "get",
        path: "/info/nationalize",
        auth: false,
        tags: ["Info"],
        summary: "Predict nationality from name",
        description: "Memprediksi kebangsaan seseorang berdasarkan nama. Sumber: nationalize.io (free, no key).",
        parameters: [
            { name: "name", in: "query", required: true, description: "Nama depan", schema: { type: "string", example: "rahmat" } },
        ],
        responses: { "200": { description: "Prediksi kebangsaan" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const name = String(req.query.name || "").trim()
        if (!name) return res.status(400).json({ ok: false, error: "name wajib diisi" })
 try {
 // api.nationalize.io is free & heavily rate-limited (429 on bursts); retry with backoff.
 let lastStatus
 for (let attempt = 0; attempt < 3; attempt++) {
 const r = await fetch(`https://api.nationalize.io?name=${encodeURIComponent(name)}`, {
 headers: { Accept: "application/json" },
 signal: AbortSignal.timeout(15000),
 })
 if (r.ok) {
 const data = await r.json()
 return res.json({
 ok: true,
 name: data.name,
 count: data.count,
 countries: (data.country || []).map(c => ({
 country_id: c.country_id,
 probability: c.probability,
 probability_percent: `${(c.probability * 100).toFixed(2)}%`,
 })),
 })
 }
 lastStatus = r.status
 if (r.status === 429) { await new Promise(res => setTimeout(res, 1200 * (attempt + 1))); continue }
 break
 }
 res.status(502).json({ ok: false, error: "Nationalize error: " + lastStatus + " (rate limited — coba lagi)" })
 } catch (e) { res.status(502).json({ ok: false, error: e.message }) }
    },
}

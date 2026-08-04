// /info/nationalize — Predict nationality from name
import axios from "axios"
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
            const { data } = await axios.get(`https://api.nationalize.io?name=${encodeURIComponent(name)}`, { timeout: 15000 })
            res.json({
                ok: true,
                name: data.name,
                count: data.count,
                countries: (data.country || []).map(c => ({
                    country_id: c.country_id,
                    probability: c.probability,
                    probability_percent: `${(c.probability * 100).toFixed(2)}%`,
                })),
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

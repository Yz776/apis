// /info/geocode — Geocoding via Open-Meteo (no key)
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/geocode",
        auth: false,
        tags: ["Info"],
        summary: "Geocoding (Open-Meteo, no key)",
        description: "Cari lokasi berdasarkan nama. Mengembalikan koordinat, negara, dll. Free, no API key.",
        parameters: [
            { name: "q", in: "query", required: true, description: "Nama lokasi", schema: { type: "string", example: "Jakarta" } },
            { name: "count", in: "query", required: false, description: "Maksimum hasil (default 5, max 20)", schema: { type: "integer", default: 5 } },
            { name: "lang", in: "query", required: false, description: "Bahasa (default en)", schema: { type: "string", default: "en" } },
        ],
        responses: { "200": { description: "Hasil geocoding" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const q = String(req.query.q || "").trim()
        if (!q) return res.status(400).json({ ok: false, error: "q wajib diisi" })
        try {
            const count = Math.min(20, Math.max(1, parseInt(req.query.count) || 5))
            const lang = String(req.query.lang || "en")
            const { data } = await axios.get("https://geocoding-api.open-meteo.com/v1/search", {
                params: { name: q, count, language: lang, format: "json" },
                timeout: 15000,
            })
            const results = (data.results || []).map(r => ({
                id: r.id,
                name: r.name,
                latitude: r.latitude,
                longitude: r.longitude,
                country: r.country,
                country_code: r.country_code,
                admin1: r.admin1,
                admin2: r.admin2,
                timezone: r.timezone,
                population: r.population,
                elevation: r.elevation,
                feature_code: r.feature_code,
            }))
            res.json({
                ok: true,
                query: q,
                returned: results.length,
                results,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

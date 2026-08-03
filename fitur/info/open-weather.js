// /info/open-weather — Weather via Open-Meteo (no key needed)
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/open-weather",
        auth: false,
        tags: ["Info"],
        summary: "Weather forecast (Open-Meteo, no key)",
        description: "Ramalan cuaca gratis tanpa API key. Berdasarkan koordinat lat/lon. Sumber: Open-Meteo.",
        parameters: [
            { name: "lat", in: "query", required: true, description: "Latitude", schema: { type: "number", example: -6.2088 } },
            { name: "lon", in: "query", required: true, description: "Longitude", schema: { type: "number", example: 106.8456 } },
            { name: "days", in: "query", required: false, description: "Jumlah hari ramalan (default 3, max 7)", schema: { type: "integer", default: 3 } },
        ],
        responses: { "200": { description: "Ramalan cuaca" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const lat = parseFloat(req.query.lat)
        const lon = parseFloat(req.query.lon)
        if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ ok: false, error: "lat dan lon wajib angka" })
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return res.status(400).json({ ok: false, error: "koordinat di luar rentang" })
        try {
            const days = Math.min(7, Math.max(1, parseInt(req.query.days) || 3))
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max&current_weather=true&timezone=auto&forecast_days=${days}`
            const { data } = await axios.get(url, { timeout: 15000 })
            res.json({
                ok: true,
                location: { lat, lon },
                timezone: data.timezone,
                current: data.current_weather,
                daily: data.daily,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

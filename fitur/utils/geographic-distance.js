// /utils/geographic-distance — Haversine distance between two GPS coordinates
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371 // Earth radius in km
    const toRad = (deg) => deg * Math.PI / 180
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(a))
}

function bearing(lat1, lon1, lat2, lon2) {
    const toRad = (d) => d * Math.PI / 180
    const toDeg = (r) => r * 180 / Math.PI
    const dLon = toRad(lon2 - lon1)
    const y = Math.sin(dLon) * Math.cos(toRad(lat2))
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon)
    return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export default {
    route: {
        method: "get",
        path: "/utils/geographic-distance",
        auth: false,
        tags: ["Utils"],
        summary: "Haversine geographic distance",
        description: "Menghitung jarak (Haversine) dan bearing antara dua koordinat GPS.",
        parameters: [
            { name: "lat1", in: "query", required: true, description: "Latitude titik 1", schema: { type: "number", example: -6.2088 } },
            { name: "lon1", in: "query", required: true, description: "Longitude titik 1", schema: { type: "number", example: 106.8456 } },
            { name: "lat2", in: "query", required: true, description: "Latitude titik 2", schema: { type: "number", example: -7.7956 } },
            { name: "lon2", in: "query", required: true, description: "Longitude titik 2", schema: { type: "number", example: 110.3695 } },
            { name: "unit", in: "query", required: false, description: "Satuan: km atau mi (default km)", schema: { type: "string", enum: ["km", "mi"], default: "km" } },
        ],
        responses: { "200": { description: "Jarak dan bearing" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const lat1 = parseFloat(req.query.lat1)
        const lon1 = parseFloat(req.query.lon1)
        const lat2 = parseFloat(req.query.lat2)
        const lon2 = parseFloat(req.query.lon2)
        if ([lat1, lon1, lat2, lon2].some(isNaN)) return res.status(400).json({ ok: false, error: "lat1, lon1, lat2, lon2 wajib angka" })
        if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) return res.status(400).json({ ok: false, error: "latitude harus -90 sampai 90" })
        try {
            const unit = String(req.query.unit || "km").toLowerCase()
            const distanceKm = haversine(lat1, lon1, lat2, lon2)
            const distance = unit === "mi" ? distanceKm * 0.621371 : distanceKm
            const brg = bearing(lat1, lon1, lat2, lon2)
            const compass = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(brg / 45) % 8]
            res.json({
                ok: true,
                from: { lat: lat1, lon: lon1 },
                to: { lat: lat2, lon: lon2 },
                distance_km: distanceKm,
                distance_mi: distanceKm * 0.621371,
                distance: distance,
                unit,
                bearing_degrees: brg,
                bearing_compass: compass,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

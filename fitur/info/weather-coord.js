// /info/weather-coord — weather by lat/lon (open-meteo, no key)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchOpenMeteo(url, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const r = await fetch(url, {
                headers: { "Accept": "application/json", "User-Agent": "KangwifiAPI/1.0" },
            })
            if (r.status === 429) {
                // Rate-limited — wait with backoff then retry
                const wait = 800 * (attempt + 1)
                await sleep(wait)
                continue
            }
            return r
        } catch (e) {
            if (attempt === retries - 1) throw e
            await sleep(500 * (attempt + 1))
        }
    }
    // Final fallback: synchronous retry without backoff
    return fetch(url, { headers: { "Accept": "application/json", "User-Agent": "KangwifiAPI/1.0" } })
}

export default {
    route: {
        method: "get",
        path: "/info/weather-coord",
        auth: false,
        tags: ["Info"],
        summary: "Weather by coordinates (Open-Meteo)",
        description: "Cuaca saat ini berdasarkan koordinat dari Open-Meteo (no API key). Auto-retry 3x saat kena rate limit.",
        parameters: [
            { name: "lat", in: "query", required: true, description: "Latitude (-90 to 90)", schema: { type: "number", example: -6.2 } },
            { name: "lon", in: "query", required: true, description: "Longitude (-180 to 180)", schema: { type: "number", example: 106.8 } },
        ],
        responses: { "200": { description: "Cuaca saat ini" }, "400": { description: "Parameter tidak valid" }, "502": { description: "Upstream error" } },
    },
    handler: async (req, res) => {
        const lat = parseFloat(req.query.lat)
        const lon = parseFloat(req.query.lon)
        if (isNaN(lat) || lat < -90 || lat > 90) return res.status(400).json({ ok: false, error: "lat tidak valid (-90 to 90)" })
        if (isNaN(lon) || lon < -180 || lon > 180) return res.status(400).json({ ok: false, error: "lon tidak valid (-180 to 180)" })
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m&timezone=auto`
            const r = await fetchOpenMeteo(url)
            if (!r.ok) {
                return res.status(502).json({
                    ok: false,
                    error: `Open-Meteo error: HTTP ${r.status}` + (r.status === 429 ? " (rate-limited, coba lagi nanti)" : ""),
                })
            }
            const data = await r.json()
            res.json({
                ok: true,
                coordinates: { latitude: data.latitude, longitude: data.longitude },
                timezone: data.timezone,
                current: data.current,
                current_units: data.current_units,
            })
        } catch (e) { res.status(502).json({ ok: false, error: e.message }) }
    },
}

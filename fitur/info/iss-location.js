// /info/iss-location — International Space Station current location
export default {
    route: {
        method: "get",
        path: "/info/iss-location",
        auth: false,
        tags: ["Info"],
        summary: "ISS current location",
        description: "Lokasi International Space Station (ISS) saat ini dari Open Notify API.",
        parameters: [],
        responses: { "200": { description: "Lokasi ISS" }, "502": { description: "Upstream error" } },
    },
    handler: async (req, res) => {
        try {
            const r = await fetch("http://api.open-notify.org/iss-now.json", { headers: { "User-Agent": "kangwifi-apis/1.0" } })
            if (!r.ok) return res.status(502).json({ ok: false, error: "Open Notify API error: " + r.status })
            const data = await r.json()
            res.json({
                ok: true,
                timestamp: data.timestamp,
                latitude: parseFloat(data.iss_position.latitude),
                longitude: parseFloat(data.iss_position.longitude),
                google_maps: `https://maps.google.com/?q=${data.iss_position.latitude},${data.iss_position.longitude}`,
            })
        } catch (e) { res.status(502).json({ ok: false, error: e.message }) }
    },
}

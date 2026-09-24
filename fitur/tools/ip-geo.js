// /tools/ip-geo — IP Geolocation via ip-api.com (Free tier: 45 req/min)
// Sumber: http://ip-api.com/docs/api:json
// Catatan: Free untuk non-komersial, rate limit 45 req/min per IP
export default {
    route: {
        method: "get",
        path: "/tools/ip-geo",
        auth: false,
        tags: ["Tools", "Geo"],
        summary: "IP Geolocation (ip-api.com)",
        description: "Lokasi geografis dari IP address (IPv4/IPv6). Free tier: 45 req/min, non-komersial.",
        parameters: [
            { name: "ip", in: "query", required: false, description: "IP target (kosong = IP client)", schema: { type: "string", example: "8.8.8.8" } },
            { name: "fields", in: "query", required: false, description: "Field yang dikembalikan (comma-separated)", schema: { type: "string", example: "status,country,city,lat,lon,isp" } },
            { name: "lang", in: "query", required: false, description: "Bahasa respons", schema: { type: "string", default: "en" } },
        ],
        responses: { "200": { description: "Data geolokasi" }, "429": { description: "Rate limit" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const { ip, fields = "status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query", lang = "en" } = req.query
        const url = new URL("http://ip-api.com/json/" + (ip ? ip : ""))
        url.searchParams.set("fields", fields)
        url.searchParams.set("lang", lang)
        try {
            const res2 = await fetch(url, { headers: { "user-agent": "Kangwifi-API/1.0" }, signal: AbortSignal.timeout(10_000) })
            const data = await res2.json()
            if (data.status === "fail") return res.status(400).json({ ok: false, error: data.message })
            res.json({ ok: true, source: "ip-api.com", ...data })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}
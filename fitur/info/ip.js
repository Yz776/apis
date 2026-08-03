// /info/ip — IP info lookup (using ipapi.co - free, no key)
import axios from "axios"

export default {
    route: {
        method: "get",
        path: "/info/ip",
        auth: false,
        tags: ["Info"],
        summary: "IP info lookup",
        description: "Cari informasi IP address (lokasi, ISP, organisasi). Tanpa parameter = IP pengirim.",
        parameters: [
            { name: "ip", in: "query", required: false, description: "IP v4/v6 yang dicek (default: IP pengirim)", schema: { type: "string", example: "8.8.8.8" } },
        ],
        responses: { "200": { description: "Info IP" }, "400": { description: "Parameter tidak valid" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const ip = String(req.query.ip || req.ip || req.connection?.remoteAddress || "").replace(/^::ffff:/, "")
        if (!ip) return res.status(400).json({ ok: false, error: "ip wajib diisi" })
        try {
            const { data } = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } })
            if (data?.error) return res.status(400).json({ ok: false, error: data.reason || "IP tidak valid" })
            res.json({
                ok: true,
                ip: data.ip,
                city: data.city,
                region: data.region,
                country: data.country_name,
                country_code: data.country,
                postal: data.postal,
                latitude: data.latitude,
                longitude: data.longitude,
                timezone: data.timezone,
                isp: data.org,
                asn: data.asn,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

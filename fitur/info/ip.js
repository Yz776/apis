// /info/ip — IP info lookup (ipwho.is - free, HTTPS, no key, no Cloudflare block)
// Upstream ipapi.co blocks server IPs — switched to ipwho.is
import axios from "axios"

export default {
    route: {
        method: "get",
        path: "/info/ip",
        auth: false,
        tags: ["Info"],
        summary: "IP info lookup",
        description: "Cari informasi IP address (lokasi, ISP, koordinat, bendera). Tanpa parameter = IP pengirim. Sumber: ipwho.is.",
        parameters: [
            { name: "ip", in: "query", required: false, description: "IP v4/v6 yang dicek (default: IP pengirim)", schema: { type: "string", example: "8.8.8.8" } },
        ],
        responses: { "200": { description: "Info IP" }, "400": { description: "Parameter tidak valid" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const ip = String(req.query.ip || req.ip || req.connection?.remoteAddress || "").replace(/^::ffff:/, "")
        if (!ip) return res.status(400).json({ ok: false, error: "ip wajib diisi" })
        try {
            // Primary: ipwho.is (HTTPS, no key)
            try {
                const { data } = await axios.get(`https://ipwho.is/${encodeURIComponent(ip)}`, {
                    timeout: 10000,
                    headers: { "User-Agent": "Mozilla/5.0" },
                    validateStatus: () => true,
                })
                if (data?.success === false) {
                    throw new Error(data?.message || "IP tidak valid")
                }
                if (data?.success) {
                    return res.json({
                        ok: true,
                        ip: data.ip,
                        type: data.type,
                        city: data.city,
                        region: data.region,
                        country: data.country,
                        country_code: data.country_code,
                        continent: data.continent,
                        postal: data.postal,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        timezone: data.timezone?.id,
                        utc_offset: data.timezone?.utc,
                        is_eu: data.is_eu,
                        calling_code: data.calling_code,
                        capital: data.capital,
                        flag_emoji: data.flag?.emoji,
                        flag_url: data.flag?.img,
                        isp: data.connection?.isp,
                        org: data.connection?.org,
                        asn: data.connection?.asn,
                        source: "ipwho.is",
                    })
                }
            } catch (e1) {
                // Fallback: ip-api.com (HTTP only — may not work on Railway)
                try {
                    const { data: d2 } = await axios.get(`http://ip-api.com/json/${encodeURIComponent(ip)}`, {
                        timeout: 10000,
                        validateStatus: () => true,
                    })
                    if (d2?.status === "success") {
                        return res.json({
                            ok: true,
                            ip: d2.query,
                            city: d2.city,
                            region: d2.regionName,
                            country: d2.country,
                            country_code: d2.countryCode,
                            postal: d2.zip,
                            latitude: d2.lat,
                            longitude: d2.lon,
                            timezone: d2.timezone,
                            isp: d2.isp,
                            org: d2.org,
                            asn: d2.as,
                            source: "ip-api.com",
                        })
                    }
                    throw new Error(d2?.message || "Gagal lookup IP")
                } catch (e2) {
                    throw new Error(`Semua upstream gagal: ${e1.message}; ${e2.message}`)
                }
            }
            throw new Error("Tidak ada respons valid dari upstream")
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

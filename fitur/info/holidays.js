// /info/holidays — Holiday info via Nager.Date API (free, no key)
import axios from "axios"

export default {
    route: {
        method: "get",
        path: "/info/holidays",
        auth: false,
        tags: ["Info"],
        summary: "Public holidays by country & year",
        description: "Mengambil daftar hari libur publik suatu negara (ISO 3166-1 alpha-2) per tahun via Nager.Date API.",
        parameters: [
            { name: "country", in: "query", required: true, description: "Kode negara 2 huruf (mis. ID, US, GB)", schema: { type: "string", example: "ID" } },
            { name: "year", in: "query", required: false, description: "Tahun (default tahun ini)", schema: { type: "integer", example: 2025 } },
        ],
        responses: { "200": { description: "Daftar hari libur" }, "400": { description: "Parameter tidak valid" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const country = String(req.query.country || "").trim().toUpperCase()
        if (!/^[A-Z]{2}$/.test(country)) return res.status(400).json({ ok: false, error: "country wajib 2 huruf (mis. ID, US)" })
        const year = parseInt(req.query.year, 10) || new Date().getFullYear()
        try {
            const { data, status } = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`, { timeout: 15000, validateStatus: () => true })
            if (status !== 200) return res.status(502).json({ ok: false, error: `Nager.Date API error ${status}` })
            const holidays = data.map(h => ({
                date: h.date,
                local_name: h.localName,
                english_name: h.name,
                country_code: h.countryCode,
                fixed: h.fixed,
                global: h.global,
                counties: h.counties || null,
                types: h.types || [],
            }))
            res.json({ ok: true, country, year, total: holidays.length, holidays })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

// /info/country — Country info via REST Countries API (free, no key)
import axios from "axios"

export default {
    route: {
        method: "get",
        path: "/info/country",
        auth: false,
        tags: ["Info"],
        summary: "Country info",
        description: "Cari informasi negara (ibukota, populasi, bendera, mata uang, bahasa, dll) via REST Countries API.",
        parameters: [
            { name: "query", in: "query", required: true, description: "Nama negara atau kode ISO 2/3 huruf (mis. indonesia, ID, IDN)", schema: { type: "string", example: "indonesia" } },
        ],
        responses: { "200": { description: "Info negara" }, "400": { description: "Parameter tidak valid" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const q = String(req.query.query || "").trim()
        if (!q) return res.status(400).json({ ok: false, error: "query wajib diisi" })
        try {
            const { data } = await axios.get(`https://restcountries.com/v3.1/name/${encodeURIComponent(q)}`, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" }, validateStatus: () => true })
            if (!Array.isArray(data) || data.length === 0) return res.status(404).json({ ok: false, error: "Negara tidak ditemukan" })
            const c = data[0]
            const currencies = c.currencies ? Object.entries(c.currencies).map(([code, v]) => ({ code, name: v.name, symbol: v.symbol })) : []
            const languages = c.languages ? Object.values(c.languages) : []
            res.json({
                ok: true,
                name: c.name?.common,
                official_name: c.name?.official,
                cca2: c.cca2,
                cca3: c.cca3,
                capital: c.capital?.[0] || null,
                region: c.region,
                subregion: c.subregion,
                population: c.population,
                area_km2: c.area,
                flag_emoji: c.flag,
                flag_url: c.flags?.png || c.flags?.svg,
                currencies,
                languages,
                timezones: c.timezones,
                calling_code: c.idd?.root && c.idd?.suffixes ? c.idd.root + c.idd.suffixes[0] : null,
                maps: c.maps?.googleMaps,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

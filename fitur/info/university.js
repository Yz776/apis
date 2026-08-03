// /info/university — University search (Hipolabs)
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/university",
        auth: false,
        tags: ["Info"],
        summary: "University search (Hipolabs)",
        description: "Cari universitas di seluruh dunia via Hipolabs University API. Filter by name atau country.",
        parameters: [
            { name: "name", in: "query", required: false, description: "Nama universitas (parsial)", schema: { type: "string", example: "harvard" } },
            { name: "country", in: "query", required: false, description: "Nama negara (cth: Indonesia)", schema: { type: "string", example: "Indonesia" } },
        ],
        responses: { "200": { description: "Daftar universitas" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const params = new URLSearchParams()
            if (req.query.name) params.append("name", req.query.name)
            if (req.query.country) params.append("country", req.query.country)
            const url = `http://universities.hipolabs.com/search?${params.toString()}`
            const { data } = await axios.get(url, { timeout: 15000 })
            const results = data.map(u => ({
                name: u.name,
                domains: u.domains,
                website: u.web_pages?.[0] || null,
                country: u.country,
                alpha_two_code: u.alpha_two_code,
                state_province: u["state-province"] || null,
            }))
            res.json({
                ok: true,
                results: results.length,
                universities: results,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

// /info/swapi — Star Wars API
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/swapi",
        auth: false,
        tags: ["Info"],
        summary: "Star Wars API (people, planets, starships)",
        description: "Cari entitas Star Wars via SWAPI. Tipe: people, planets, films, species, vehicles, starships.",
        parameters: [
            { name: "type", in: "query", required: false, description: "Tipe resource", schema: { type: "string", enum: ["people", "planets", "films", "species", "vehicles", "starships"], default: "people" } },
            { name: "id", in: "query", required: false, description: "ID resource (1-based). Kosongkan untuk list.", schema: { type: "integer" } },
            { name: "search", in: "query", required: false, description: "Query pencarian (cth: luke)", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Data Star Wars" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const type = String(req.query.type || "people").toLowerCase()
            const allowed = ["people", "planets", "films", "species", "vehicles", "starships"]
            if (!allowed.includes(type)) return res.status(400).json({ ok: false, error: `type harus salah satu: ${allowed.join(", ")}` })
            let url = `https://swapi.dev/api/${type}/`
            if (req.query.id) url += `${parseInt(req.query.id)}/`
            else if (req.query.search) url += `?search=${encodeURIComponent(req.query.search)}`
            const { data } = await axios.get(url, { timeout: 15000 })
            if (req.query.id) {
                return res.json({ ok: true, type, id: parseInt(req.query.id), data })
            }
            res.json({
                ok: true,
                type,
                count: data.count,
                next: data.next,
                previous: data.previous,
                results: data.results,
                returned: data.results?.length || 0,
            })
        } catch (e) {
            if (e.response?.status === 404) return res.status(404).json({ ok: false, error: "Resource tidak ditemukan" })
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

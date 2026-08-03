// /info/space-people — People currently in space
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/space-people",
        auth: false,
        tags: ["Info"],
        summary: "People currently in space",
        description: "Daftar orang yang saat ini berada di luar angkasa (ISS, Tiangong, dll). Sumber: Open Notify.",
        parameters: [],
        responses: { "200": { description: "Daftar astronot" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const { data } = await axios.get("http://api.open-notify.org/astros.json", { timeout: 15000 })
            const people = (data.people || []).map(p => ({
                name: p.name,
                craft: p.craft,
            }))
            const byCraft = {}
            for (const p of people) {
                byCraft[p.craft] = (byCraft[p.craft] || 0) + 1
            }
            res.json({
                ok: true,
                total: data.number || people.length,
                craft_summary: byCraft,
                people,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

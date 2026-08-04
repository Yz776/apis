// /info/space-people — People currently in space
// Upstream api.open-notify.org is HTTP-only (Railway blocks plain HTTP) — switched to HTTPS mirror
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/space-people",
        auth: false,
        tags: ["Info"],
        summary: "People currently in space",
        description: "Daftar orang yang saat ini berada di luar angkasa (ISS, Tiangong, dll). Sumber: howmanypeopleareinspacerightnow.com (HTTPS).",
        parameters: [],
        responses: { "200": { description: "Daftar astronot" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const { data } = await axios.get(
                "https://www.howmanypeopleareinspacerightnow.com/peopleinspace.json",
                { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" }, validateStatus: () => true }
            )
            if (!data?.people) throw new Error("Format respons tidak valid")

            const people = (data.people || []).map(p => ({
                name: p.name,
                craft: p.location || p.title || "Unknown",
                country: p.country || null,
                country_flag: p.countryflag || null,
                bio_photo: p.biophoto || null,
                launch_date: p.launchdate || null,
                career_days: p.careerdays || null,
                title: p.title || null,
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
                source: "howmanypeopleareinspacerightnow.com",
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

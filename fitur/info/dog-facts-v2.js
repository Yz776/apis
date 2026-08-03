// /info/dog-facts-v2 — Random dog facts (DuckDuckGo-style)
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/dog-facts-v2",
        auth: false,
        tags: ["Info"],
        summary: "Dog facts (v2)",
        description: "Fakta acak tentang anjing dari dog-api.fact (definisi alternatif).",
        parameters: [],
        responses: { "200": { description: "Fakta anjing" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const { data } = await axios.get("https://dog-api.fact.gg/facts", { timeout: 15000 })
            const facts = (data.facts || []).slice(0, 1)
            res.json({ ok: true, facts })
        } catch (e) {
            // fallback
            try {
                const { data: d2 } = await axios.get("https://dog.ceo/api/breeds/list/all", { timeout: 10000 })
                const breeds = Object.keys(d2.message || {})
                res.json({ ok: true, fact: `There are ${breeds.length} dog breeds registered in Dog CEO. Some: ${breeds.slice(0, 5).join(", ")}.`, breeds_total: breeds.length })
            } catch (e2) { res.status(500).json({ ok: false, error: e.message }) }
        }
    },
}

// /info/useless-fact — Random useless fact
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/useless-fact",
        auth: false,
        tags: ["Info"],
        summary: "Random useless fact",
        description: "Fakta tidak berguna acak dari uselessfacts.jsph.pl.",
        parameters: [],
        responses: { "200": { description: "Fakta tidak berguna" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const { data } = await axios.get("https://uselessfacts.jsph.pl/api/v2/facts/random", { timeout: 15000 })
            res.json({
                ok: true,
                id: data.id,
                text: data.text,
                source: data.source,
                source_url: data.source_url,
                language: data.language,
                permalink: data.permalink,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

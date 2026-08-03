// /info/joke — Random joke (Official Joke API)
import axios from "axios"

export default {
    route: {
        method: "get",
        path: "/info/joke",
        auth: false,
        tags: ["Info"],
        summary: "Random joke",
        description: "Mengambil lelucon acak (single atau two-part) via Official Joke API.",
        parameters: [],
        responses: { "200": { description: "Joke" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const { data } = await axios.get("https://official-joke-api.appspot.com/random_joke", { timeout: 15000 })
            res.json({ ok: true, id: data.id, type: data.type, setup: data.setup, punchline: data.punchline, full: `${data.setup} ${data.punchline}` })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

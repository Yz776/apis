// /info/xkcd — xkcd comic fetcher
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/xkcd",
        auth: false,
        tags: ["Info"],
        summary: "xkcd comic",
        description: "Ambil komik xkcd (latest, by ID, atau random).",
        parameters: [
            { name: "id", in: "query", required: false, description: "ID komik (kosongkan untuk latest)", schema: { type: "integer" } },
            { name: "random", in: "query", required: false, description: "true untuk komik acak", schema: { type: "boolean", default: false } },
        ],
        responses: { "200": { description: "Komik xkcd" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const id = req.query.id
            const random = req.query.random === "true" || req.query.random === "1"
            let url
            if (random) {
                const { data: latest } = await axios.get("https://xkcd.com/info.0.json", { timeout: 15000 })
                const rand = Math.floor(Math.random() * latest.num) + 1
                url = `https://xkcd.com/${rand}/info.0.json`
            } else if (id) {
                url = `https://xkcd.com/${id}/info.0.json`
            } else {
                url = "https://xkcd.com/info.0.json"
            }
            const { data } = await axios.get(url, { timeout: 15000 })
            res.json({
                ok: true,
                id: data.num,
                title: data.title,
                description: data.alt,
                img: data.img,
                date: `${data.year}-${data.month.padStart(2, "0")}-${data.day.padStart(2, "0")}`,
                link: `https://xkcd.com/${data.num}`,
                transcript: data.transcript || null,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

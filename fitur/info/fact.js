// /info/fact — Random number fact (numbersapi.com)
import axios from "axios"

export default {
    route: {
        method: "get",
        path: "/info/fact",
        auth: false,
        tags: ["Info"],
        summary: "Random fact",
        description: "Fakta acak tentang angka atau tanggal. Type: math, trivia, year, date. Tanpa type = random trivia.",
        parameters: [
            { name: "number", in: "query", required: false, description: "Angka spesifik (default random)", schema: { type: "string", example: "42" } },
            { name: "type", in: "query", required: false, description: "Jenis fakta: trivia, math, year, date (default trivia)", schema: { type: "string", enum: ["trivia", "math", "year", "date"], default: "trivia" } },
        ],
        responses: { "200": { description: "Fakta" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const num = String(req.query.number || "random").trim()
        const type = String(req.query.type || "trivia").trim().toLowerCase()
        try {
            const { data } = await axios.get(`http://numbersapi.com/${num}/${type}`, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } })
            // response is plain text
            const text = typeof data === "string" ? data : JSON.stringify(data)
            res.json({ ok: true, number: num, type, fact: text })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

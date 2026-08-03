// /info/numbers — Numbers API (math, trivia, date, year)
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/numbers",
        auth: false,
        tags: ["Info"],
        summary: "Numbers API (trivia, math, date, year)",
        description: "Fakta tentang angka via numbersapi.com. Tipe: trivia, math, date (MM/DD), year.",
        parameters: [
            { name: "number", in: "query", required: false, description: "Angka (default random)", schema: { type: "string", example: "42" } },
            { name: "type", in: "query", required: false, description: "Tipe: trivia, math, date, year (default trivia)", schema: { type: "string", enum: ["trivia", "math", "date", "year"], default: "trivia" } },
        ],
        responses: { "200": { description: "Fakta angka" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const number = req.query.number || "random"
            const type = String(req.query.type || "trivia").toLowerCase()
            const url = `http://numbersapi.com/${number}/${type}?json`
            const { data } = await axios.get(url, { timeout: 15000 })
            if (!data.found) return res.json({ ok: true, found: false, message: "Tidak ada fakta untuk angka ini" })
            res.json({
                ok: true,
                found: data.found,
                number: data.number,
                type: data.type,
                text: data.text,
                date: data.date || null,
                year: data.year || null,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

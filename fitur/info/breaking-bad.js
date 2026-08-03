// /info/breaking-bad — Breaking Bad quotes (with local fallback)
const LOCAL_BB_QUOTES = [
    { quote: "I am the one who knocks!", author: "Walter White" },
    { quote: "Yeah, Mr. White! Yeah, science!", author: "Jesse Pinkman" },
    { quote: "Say my name.", author: "Walter White" },
    { quote: "I did it for me. I liked it. I was good at it.", author: "Walter White" },
    { quote: "Bitch!", author: "Jesse Pinkman" },
    { quote: "We're in the empire business.", author: "Walter White" },
    { quote: "Tread lightly.", author: "Walter White" },
    { quote: "Yo, Mr. White, I think we got a problem.", author: "Jesse Pinkman" },
    { quote: "It's me or him.", author: "Walter White" },
    { quote: "He can't keep getting away with this!", author: "Jesse Pinkman" },
]

import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/breaking-bad",
        auth: false,
        tags: ["Info"],
        summary: "Breaking Bad quotes",
        description: "Kutipan acak dari Breaking Bad. Sumber: breakingbadquotes.xyz; fallback ke DB lokal.",
        parameters: [
            { name: "count", in: "query", required: false, description: "Jumlah quote (default 1, max 50)", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "Quote" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const count = Math.min(50, Math.max(1, parseInt(req.query.count) || 1))
        try {
            const { data } = await axios.get(`https://api.breakingbadquotes.xyz/v1/quotes/${count}`, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } })
            const quotes = (Array.isArray(data) ? data : [data]).map(q => ({
                quote: q.quote,
                author: q.author,
            }))
            res.json({ ok: true, count: quotes.length, quotes, source: "breakingbadquotes.xyz" })
        } catch (e) {
            // Fallback to local DB
            const shuffled = [...LOCAL_BB_QUOTES].sort(() => Math.random() - 0.5)
            const quotes = shuffled.slice(0, Math.min(count, LOCAL_BB_QUOTES.length))
            res.json({ ok: true, count: quotes.length, quotes, source: "local-database", note: `upstream failed: ${e.message}` })
        }
    },
}

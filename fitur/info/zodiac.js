// /info/zodiac — Zodiac sign from birthday
const ZODIAC = [
    { sign: "Capricorn", element: "Earth", symbol: "Capricornus", start: [12, 22], end: [1, 19] },
    { sign: "Aquarius", element: "Air", symbol: "Water Bearer", start: [1, 20], end: [2, 18] },
    { sign: "Pisces", element: "Water", symbol: "Fishes", start: [2, 19], end: [3, 20] },
    { sign: "Aries", element: "Fire", symbol: "Ram", start: [3, 21], end: [4, 19] },
    { sign: "Taurus", element: "Earth", symbol: "Bull", start: [4, 20], end: [5, 20] },
    { sign: "Gemini", element: "Air", symbol: "Twins", start: [5, 21], end: [6, 20] },
    { sign: "Cancer", element: "Water", symbol: "Crab", start: [6, 21], end: [7, 22] },
    { sign: "Leo", element: "Fire", symbol: "Lion", start: [7, 23], end: [8, 22] },
    { sign: "Virgo", element: "Earth", symbol: "Maiden", start: [8, 23], end: [9, 22] },
    { sign: "Libra", element: "Air", symbol: "Scales", start: [9, 23], end: [10, 22] },
    { sign: "Scorpio", element: "Water", symbol: "Scorpion", start: [10, 23], end: [11, 21] },
    { sign: "Sagittarius", element: "Fire", symbol: "Archer", start: [11, 22], end: [12, 21] },
]
function getZodiac(month, day) {
    for (const z of ZODIAC) {
        const [sm, sd] = z.start
        const [em, ed] = z.end
        if (sm === em) {
            if (month === sm && day >= sd && day <= ed) return z
        } else if (sm > em) {
            // wraps year (Capricorn)
            if ((month === sm && day >= sd) || (month === em && day <= ed)) return z
        } else {
            if ((month === sm && day >= sd) || (month === em && day <= ed) ||
                (month > sm && month < em)) return z
        }
    }
    return null
}

export default {
    route: {
        method: "get",
        path: "/info/zodiac",
        auth: false,
        tags: ["Info"],
        summary: "Zodiac sign from birthday",
        description: "Mencari zodiac barat dari tanggal lahir (month/day).",
        parameters: [
            { name: "month", in: "query", required: true, description: "Bulan lahir 1-12", schema: { type: "integer", example: 7 } },
            { name: "day", in: "query", required: true, description: "Tanggal lahir 1-31", schema: { type: "integer", example: 15 } },
        ],
        responses: { "200": { description: "Zodiac" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const m = parseInt(req.query.month, 10)
        const d = parseInt(req.query.day, 10)
        if (!m || !d || m < 1 || m > 12 || d < 1 || d > 31) return res.status(400).json({ ok: false, error: "month (1-12) dan day (1-31) wajib diisi" })
        const z = getZodiac(m, d)
        if (!z) return res.status(400).json({ ok: false, error: "Tanggal tidak valid" })
        res.json({ ok: true, month: m, day: d, sign: z.sign, element: z.element, symbol: z.symbol, date_range: `${z.start[0]}/${z.start[1]} - ${z.end[0]}/${z.end[1]}` })
    },
}

// /utils/roman — Roman numeral converter
function toRoman(num) {
    if (num <= 0 || num >= 4000 || !Number.isInteger(num)) return null
    const map = [["M", 1000], ["CM", 900], ["D", 500], ["CD", 400], ["C", 100], ["XC", 90], ["L", 50], ["XL", 40], ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]]
    let out = ""
    for (const [s, v] of map) { while (num >= v) { out += s; num -= v } }
    return out
}
function fromRoman(s) {
    const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
    let total = 0, prev = 0
    for (const c of s.toUpperCase().split("").reverse()) {
        const v = map[c]
        if (!v) return null
        if (v < prev) total -= v
        else { total += v; prev = v }
    }
    return total
}

export default {
    route: {
        method: "get",
        path: "/utils/roman",
        auth: false,
        tags: ["Utils"],
        summary: "Roman numeral converter",
        description: "Konversi antara angka Arab (1-3999) dan angka Romawi (I-MMMCMXCIX).",
        parameters: [
            { name: "value", in: "query", required: true, description: "Angka (1-3999) atau angka Romawi (mis. XIV)", schema: { type: "string", example: "2024" } },
        ],
        responses: { "200": { description: "Hasil konversi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const v = String(req.query.value || "").trim()
        if (!v) return res.status(400).json({ ok: false, error: "value wajib diisi" })
        if (/^\d+$/.test(v)) {
            const n = parseInt(v, 10)
            const r = toRoman(n)
            if (!r) return res.status(400).json({ ok: false, error: "angka harus integer 1-3999" })
            return res.json({ ok: true, input: n, type: "to_roman", result: r })
        }
        if (/^[ivxlcdm]+$/i.test(v)) {
            const n = fromRoman(v)
            if (!n || n < 1) return res.status(400).json({ ok: false, error: "bukan angka Romawi yang valid" })
            return res.json({ ok: true, input: v.toUpperCase(), type: "from_roman", result: n })
        }
        res.status(400).json({ ok: false, error: "value harus angka (1-3999) atau string Romawi" })
    },
}

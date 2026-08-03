// /utils/unit-temperature — temperature converter
function toC(value, from) {
    if (from === "c") return value
    if (from === "f") return (value - 32) * 5 / 9
    if (from === "k") return value - 273.15
    if (from === "r") return (value - 491.67) * 5 / 9
    throw new Error("from tidak valid")
}
function fromC(c, to) {
    if (to === "c") return c
    if (to === "f") return c * 9 / 5 + 32
    if (to === "k") return c + 273.15
    if (to === "r") return (c + 273.15) * 9 / 5
    throw new Error("to tidak valid")
}

const UNITS = ["c", "f", "k", "r"]

export default {
    route: {
        method: "get",
        path: "/utils/unit-temperature",
        auth: false,
        tags: ["Utils"],
        summary: "Temperature unit converter",
        description: "Konversi suhu: Celsius (C), Fahrenheit (F), Kelvin (K), Rankine (R).",
        parameters: [
            { name: "value", in: "query", required: true, description: "Nilai", schema: { type: "number", example: 100 } },
            { name: "from", in: "query", required: true, description: "Satuan asal (c/f/k/r)", schema: { type: "string", enum: UNITS, example: "c" } },
            { name: "to", in: "query", required: false, description: "Satuan tujuan (jika kosong, semua)", schema: { type: "string", enum: UNITS } },
        ],
        responses: { "200": { description: "Hasil konversi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const value = parseFloat(req.query.value)
        if (isNaN(value)) return res.status(400).json({ ok: false, error: "value wajib angka" })
        const from = String(req.query.from || "").toLowerCase()
        if (!UNITS.includes(from)) return res.status(400).json({ ok: false, error: "from tidak valid" })
        try {
            const c = toC(value, from)
            const to = req.query.to ? String(req.query.to).toLowerCase() : null
            if (to) {
                if (!UNITS.includes(to)) return res.status(400).json({ ok: false, error: "to tidak valid" })
                return res.json({ ok: true, value, from, to, result: fromC(c, to) })
            }
            const all = {}
            for (const u of UNITS) all[u] = fromC(c, u)
            res.json({ ok: true, value, from, celsius: c, conversions: all })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

// /utils/unit-weight — weight/mass unit converter
const TO_G = {
    mg: 0.001, g: 1, kg: 1000, t: 1000000, // metric
    oz: 28.349523125, lb: 453.59237, stone: 6350.29318,
    cwt: 50802.34544, ton_us: 907184.74, ton_uk: 1016046.9088,
}

export default {
    route: {
        method: "get",
        path: "/utils/unit-weight",
        auth: false,
        tags: ["Utils"],
        summary: "Weight/mass unit converter",
        description: "Konversi satuan berat/massa: mg, g, kg, t, oz, lb, stone, cwt, ton_us, ton_uk.",
        parameters: [
            { name: "value", in: "query", required: true, description: "Nilai", schema: { type: "number", example: 1 } },
            { name: "from", in: "query", required: true, description: "Satuan asal", schema: { type: "string", example: "kg" } },
            { name: "to", in: "query", required: false, description: "Satuan tujuan (jika kosong, semua)", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Hasil konversi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const value = parseFloat(req.query.value)
        if (isNaN(value)) return res.status(400).json({ ok: false, error: "value wajib angka" })
        const from = String(req.query.from || "").toLowerCase()
        if (!TO_G[from]) return res.status(400).json({ ok: false, error: "from tidak valid" })
        const grams = value * TO_G[from]
        const to = req.query.to ? String(req.query.to).toLowerCase() : null
        if (to) {
            if (!TO_G[to]) return res.status(400).json({ ok: false, error: "to tidak valid" })
            return res.json({ ok: true, value, from, to, result: grams / TO_G[to] })
        }
        const all = {}
        for (const [u, factor] of Object.entries(TO_G)) all[u] = grams / factor
        res.json({ ok: true, value, from, grams, conversions: all })
    },
}

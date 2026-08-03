// /utils/unit-speed — speed unit converter
const TO_MS = {
    "m/s": 1, "m/s (mps)": 1,
    "km/h": 0.2777777777777778, "kph": 0.2777777777777778,
    "mph": 0.44704, "ft/s": 0.3048, "fps": 0.3048,
    "knot": 0.5144444444444444, "kn": 0.5144444444444444,
    "mach": 343,
}

export default {
    route: {
        method: "get",
        path: "/utils/unit-speed",
        auth: false,
        tags: ["Utils"],
        summary: "Speed unit converter",
        description: "Konversi satuan kecepatan: m/s, km/h, mph, ft/s, knot, mach.",
        parameters: [
            { name: "value", in: "query", required: true, description: "Nilai", schema: { type: "number", example: 100 } },
            { name: "from", in: "query", required: true, description: "Satuan asal", schema: { type: "string", example: "km/h" } },
            { name: "to", in: "query", required: false, description: "Satuan tujuan (jika kosong, semua)", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Hasil konversi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const value = parseFloat(req.query.value)
        if (isNaN(value)) return res.status(400).json({ ok: false, error: "value wajib angka" })
        const from = String(req.query.from || "").toLowerCase()
        if (!TO_MS[from]) return res.status(400).json({ ok: false, error: "from tidak valid" })
        const ms = value * TO_MS[from]
        const to = req.query.to ? String(req.query.to).toLowerCase() : null
        if (to) {
            if (!TO_MS[to]) return res.status(400).json({ ok: false, error: "to tidak valid" })
            return res.json({ ok: true, value, from, to, result: ms / TO_MS[to] })
        }
        const all = {}
        for (const [u, factor] of Object.entries(TO_MS)) all[u] = ms / factor
        res.json({ ok: true, value, from, "m/s": ms, conversions: all })
    },
}

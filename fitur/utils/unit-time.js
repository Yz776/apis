// /utils/unit-time — time unit converter
const TO_S = {
    ns: 1e-9, us: 1e-6, ms: 0.001, s: 1,
    min: 60, hr: 3600, day: 86400, week: 604800,
    month: 2629800, year: 31557600, decade: 315576000, century: 3155760000,
}

export default {
    route: {
        method: "get",
        path: "/utils/unit-time",
        auth: false,
        tags: ["Utils"],
        summary: "Time unit converter",
        description: "Konversi satuan waktu: ns, us, ms, s, min, hr, day, week, month, year, decade, century.",
        parameters: [
            { name: "value", in: "query", required: true, description: "Nilai", schema: { type: "number", example: 1 } },
            { name: "from", in: "query", required: true, description: "Satuan asal", schema: { type: "string", example: "day" } },
            { name: "to", in: "query", required: false, description: "Satuan tujuan (jika kosong, semua)", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Hasil konversi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const value = parseFloat(req.query.value)
        if (isNaN(value)) return res.status(400).json({ ok: false, error: "value wajib angka" })
        const from = String(req.query.from || "").toLowerCase()
        if (!TO_S[from]) return res.status(400).json({ ok: false, error: "from tidak valid" })
        const seconds = value * TO_S[from]
        const to = req.query.to ? String(req.query.to).toLowerCase() : null
        if (to) {
            if (!TO_S[to]) return res.status(400).json({ ok: false, error: "to tidak valid" })
            return res.json({ ok: true, value, from, to, result: seconds / TO_S[to] })
        }
        const all = {}
        for (const [u, factor] of Object.entries(TO_S)) all[u] = seconds / factor
        res.json({ ok: true, value, from, seconds, conversions: all })
    },
}

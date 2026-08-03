// /utils/interest — simple & compound interest calculator
export default {
    route: {
        method: "get",
        path: "/utils/interest",
        auth: false,
        tags: ["Utils"],
        summary: "Simple & compound interest",
        description: "Hitung bunga simple atau compound. Compound: A = P(1 + r/n)^(nt).",
        parameters: [
            { name: "principal", in: "query", required: true, description: "Pokok pinjaman/investasi", schema: { type: "number", example: 1000000 } },
            { name: "rate", in: "query", required: true, description: "Suku bunga tahunan (%)", schema: { type: "number", example: 5 } },
            { name: "time", in: "query", required: true, description: "Periode (tahun)", schema: { type: "number", example: 3 } },
            { name: "type", in: "query", required: false, description: "simple atau compound (default compound)", schema: { type: "string", enum: ["simple", "compound"], default: "compound" } },
            { name: "n", in: "query", required: false, description: "Frekuensi compounding/tahun (default 12, untuk compound)", schema: { type: "integer", default: 12 } },
        ],
        responses: { "200": { description: "Hasil bunga" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const p = parseFloat(req.query.principal)
        const r = parseFloat(req.query.rate)
        const t = parseFloat(req.query.time)
        if (isNaN(p) || isNaN(r) || isNaN(t)) return res.status(400).json({ ok: false, error: "principal, rate, time wajib angka" })
        if (p < 0 || t < 0) return res.status(400).json({ ok: false, error: "principal dan time tidak boleh negatif" })
        const type = String(req.query.type || "compound").toLowerCase()
        let amount, interest
        if (type === "simple") {
            interest = p * (r / 100) * t
            amount = p + interest
        } else {
            let n = parseInt(req.query.n, 10) || 12
            if (n < 1) n = 1
            amount = p * Math.pow(1 + (r / 100) / n, n * t)
            interest = amount - p
        }
        res.json({
            ok: true,
            type,
            principal: p,
            rate_percent: r,
            time_years: t,
            ...(type === "compound" ? { compound_freq: parseInt(req.query.n, 10) || 12 } : {}),
            interest: Number(interest.toFixed(2)),
            amount: Number(amount.toFixed(2)),
        })
    },
}

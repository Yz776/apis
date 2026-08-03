// /utils/root — root calculator (sqrt, cbrt, nth root)
export default {
    route: {
        method: "get",
        path: "/utils/root",
        auth: false,
        tags: ["Utils"],
        summary: "Root calculator (square/cube/nth root)",
        description: "Hitung akar kuadrat, akar pangkat 3, atau akar pangkat-n dari bilangan.",
        parameters: [
            { name: "x", in: "query", required: true, description: "Bilangan", schema: { type: "number", example: 27 } },
            { name: "n", in: "query", required: false, description: "Pangkat akar (2=sqrt default, 3=cbrt)", schema: { type: "integer", default: 2, example: 3 } },
        ],
        responses: { "200": { description: "Hasil akar" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const x = parseFloat(req.query.x)
        if (isNaN(x)) return res.status(400).json({ ok: false, error: "x wajib angka" })
        let n = parseInt(req.query.n, 10) || 2
        if (n < 1) return res.status(400).json({ ok: false, error: "n minimal 1" })
        if (n === 2 && x < 0) return res.status(400).json({ ok: false, error: "akar kuadrat dari bilangan negatif tidak real" })
        let result, isComplex = false
        if (n % 2 === 0 && x < 0) return res.status(400).json({ ok: false, error: "akar pangkat genap dari negatif tidak real" })
        try {
            if (n === 2) result = Math.sqrt(x)
            else if (n === 3) result = Math.cbrt(x)
            else result = Math.sign(x) * Math.pow(Math.abs(x), 1 / n)
        } catch (e) { return res.status(400).json({ ok: false, error: e.message }) }
        res.json({ ok: true, x, n, result, verification: Math.pow(result, n) })
    },
}

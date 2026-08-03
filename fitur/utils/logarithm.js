// /utils/logarithm — logarithm calculator
const FUNCS = ["ln", "log10", "log2", "log"]

export default {
    route: {
        method: "get",
        path: "/utils/logarithm",
        auth: false,
        tags: ["Utils"],
        summary: "Logarithm calculator",
        description: "Hitung logaritma: ln (basis e), log10, log2, atau log basis kustom.",
        parameters: [
            { name: "x", in: "query", required: true, description: "Nilai", schema: { type: "number", example: 100 } },
            { name: "func", in: "query", required: false, description: "Fungsi (default log10)", schema: { type: "string", enum: FUNCS, default: "log10" } },
            { name: "base", in: "query", required: false, description: "Basis kustom (hanya jika func=log)", schema: { type: "number", example: 10 } },
        ],
        responses: { "200": { description: "Hasil logaritma" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const x = parseFloat(req.query.x)
        if (isNaN(x)) return res.status(400).json({ ok: false, error: "x wajib angka" })
        if (x <= 0) return res.status(400).json({ ok: false, error: "x harus > 0" })
        const func = String(req.query.func || "log10").toLowerCase()
        if (!FUNCS.includes(func)) return res.status(400).json({ ok: false, error: "func tidak valid" })
        let result, formula
        if (func === "ln") { result = Math.log(x); formula = `ln(${x})` }
        else if (func === "log10") { result = Math.log10(x); formula = `log10(${x})` }
        else if (func === "log2") { result = Math.log2(x); formula = `log2(${x})` }
        else {
            const base = parseFloat(req.query.base)
            if (isNaN(base) || base <= 0 || base === 1) return res.status(400).json({ ok: false, error: "base harus > 0 dan ≠ 1" })
            result = Math.log(x) / Math.log(base)
            formula = `log_${base}(${x})`
        }
        res.json({ ok: true, formula, x, func, base: func === "log" ? parseFloat(req.query.base) : null, result })
    },
}

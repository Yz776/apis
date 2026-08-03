// /utils/percentage — percentage calculator
export default {
    route: {
        method: "get",
        path: "/utils/percentage",
        auth: false,
        tags: ["Utils"],
        summary: "Percentage calculator",
        description: "Hitung berbagai operasi persentase: X% dari Y, X adalah berapa % dari Y, persentase perubahan.",
        parameters: [
            { name: "mode", in: "query", required: true, description: "Mode: of (X% dari Y), is (X adalah % dari Y), change (% perubahan dari X ke Y)", schema: { type: "string", enum: ["of", "is", "change"], example: "of" } },
            { name: "x", in: "query", required: true, description: "Nilai X", schema: { type: "number", example: 20 } },
            { name: "y", in: "query", required: true, description: "Nilai Y", schema: { type: "number", example: 150 } },
        ],
        responses: { "200": { description: "Hasil persentase" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const mode = String(req.query.mode)
        const x = parseFloat(req.query.x)
        const y = parseFloat(req.query.y)
        if (isNaN(x) || isNaN(y)) return res.status(400).json({ ok: false, error: "x dan y wajib berupa angka" })
        let result, explanation
        if (mode === "of") {
            result = (x / 100) * y
            explanation = `${x}% dari ${y} = ${result}`
        } else if (mode === "is") {
            if (y === 0) return res.status(400).json({ ok: false, error: "y tidak boleh 0 untuk mode is" })
            result = (x / y) * 100
            explanation = `${x} adalah ${result}% dari ${y}`
        } else if (mode === "change") {
            if (x === 0) return res.status(400).json({ ok: false, error: "x tidak boleh 0 untuk mode change" })
            result = ((y - x) / Math.abs(x)) * 100
            explanation = `Perubahan dari ${x} ke ${y} = ${result}%`
        } else {
            return res.status(400).json({ ok: false, error: "mode harus of, is, atau change" })
        }
        res.json({ ok: true, mode, x, y, result: Number(result.toFixed(10)), explanation })
    },
}

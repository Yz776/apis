// /utils/trig — trigonometric functions
const FUNCS = ["sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh"]

export default {
    route: {
        method: "get",
        path: "/utils/trig",
        auth: false,
        tags: ["Utils"],
        summary: "Trigonometric functions",
        description: "Hitung fungsi trigonometri (sin, cos, tan, asin, acos, atan, sinh, cosh, tanh).",
        parameters: [
            { name: "func", in: "query", required: true, description: "Fungsi", schema: { type: "string", enum: FUNCS, example: "sin" } },
            { name: "x", in: "query", required: true, description: "Nilai input", schema: { type: "number", example: 0.5 } },
            { name: "unit", in: "query", required: false, description: "Satuan input: rad atau deg (default rad, hanya untuk sin/cos/tan)", schema: { type: "string", enum: ["rad", "deg"], default: "rad" } },
        ],
        responses: { "200": { description: "Hasil trigonometri" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const func = String(req.query.func)
        if (!FUNCS.includes(func)) return res.status(400).json({ ok: false, error: "func tidak valid" })
        const x = parseFloat(req.query.x)
        if (isNaN(x)) return res.status(400).json({ ok: false, error: "x wajib angka" })
        const unit = String(req.query.unit || "rad").toLowerCase()
        let input = x
        if (["sin", "cos", "tan"].includes(func) && unit === "deg") input = x * Math.PI / 180
        let result
        try {
            result = Math[func](input)
            if (["asin", "acos", "atan"].includes(func) && unit === "deg") result = result * 180 / Math.PI
        } catch (e) { return res.status(400).json({ ok: false, error: e.message }) }
        if (!isFinite(result)) return res.status(400).json({ ok: false, error: "hasil tidak terdefinisi (mis. asin di luar [-1,1])" })
        res.json({ ok: true, func, x, unit, result })
    },
}

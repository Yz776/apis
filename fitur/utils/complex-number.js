// /utils/complex-number — Complex number operations
function parseComplex(str) {
    str = str.replace(/\s/g, "").replace(/i$/, "")
    if (str === "") return { re: 0, im: 1 }
    if (str === "-") return { re: 0, im: -1 }
    if (str === "+") return { re: 0, im: 1 }
    if (!/[+-]/.test(str.slice(1))) {
        return { re: 0, im: parseFloat(str) }
    }
    // try splitting
    const m = str.match(/^(-?[\d.]+)([+-])([\d.]+)$/)
    if (m) {
        return { re: parseFloat(m[1]), im: parseFloat((m[2] === "-" ? "-" : "") + m[3]) }
    }
    return { re: parseFloat(str), im: 0 }
}

function fmt(c) {
    if (c.im === 0) return `${c.re}`
    if (c.re === 0) return `${c.im}i`
    return `${c.re}${c.im >= 0 ? "+" : ""}${c.im}i`
}

export default {
    route: {
        method: "get",
        path: "/utils/complex-number",
        auth: false,
        tags: ["Utils"],
        summary: "Complex number operations",
        description: "Operasi bilangan kompleks: add, sub, mul, div, magnitude, conjugate. Format: 3+4i",
        parameters: [
            { name: "a", in: "query", required: true, description: "Bilangan kompleks pertama (cth: 3+4i)", schema: { type: "string", example: "3+4i" } },
            { name: "b", in: "query", required: true, description: "Bilangan kompleks kedua (cth: 1-2i)", schema: { type: "string", example: "1-2i" } },
            { name: "op", in: "query", required: false, description: "Operasi (default add)", schema: { type: "string", enum: ["add", "sub", "mul", "div", "magnitude", "conjugate"], default: "add" } },
        ],
        responses: { "200": { description: "Hasil operasi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const aStr = String(req.query.a || "")
        const bStr = String(req.query.b || "")
        if (!aStr) return res.status(400).json({ ok: false, error: "a wajib diisi" })
        try {
            const a = parseComplex(aStr)
            const op = String(req.query.op || "add").toLowerCase()
            let result, b
            if (["add", "sub", "mul", "div"].includes(op)) {
                if (!bStr) return res.status(400).json({ ok: false, error: "b wajib diisi untuk operasi ini" })
                b = parseComplex(bStr)
            }
            switch (op) {
                case "add":
                    result = { re: a.re + b.re, im: a.im + b.im }
                    break
                case "sub":
                    result = { re: a.re - b.re, im: a.im - b.im }
                    break
                case "mul":
                    result = { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }
                    break
                case "div": {
                    const denom = b.re * b.re + b.im * b.im
                    if (denom === 0) return res.status(400).json({ ok: false, error: "division by zero" })
                    result = { re: (a.re * b.re + a.im * b.im) / denom, im: (a.im * b.re - a.re * b.im) / denom }
                    break
                }
                case "magnitude":
                    result = { magnitude: Math.sqrt(a.re * a.re + a.im * a.im) }
                    break
                case "conjugate":
                    result = { re: a.re, im: -a.im }
                    break
                default:
                    return res.status(400).json({ ok: false, error: "op tidak valid" })
            }
            res.json({
                ok: true,
                a: fmt(a),
                b: b ? fmt(b) : undefined,
                op,
                result: "magnitude" in result ? result.magnitude : fmt(result),
                result_obj: result,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

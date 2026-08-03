// /utils/quadratic — quadratic equation solver
export default {
    route: {
        method: "get",
        path: "/utils/quadratic",
        auth: false,
        tags: ["Utils"],
        summary: "Quadratic equation solver (ax² + bx + c = 0)",
        description: "Selesaikan persamaan kuadrat ax² + bx + c = 0. Mendukung akar real & kompleks.",
        parameters: [
            { name: "a", in: "query", required: true, description: "Koefisien a", schema: { type: "number", example: 1 } },
            { name: "b", in: "query", required: true, description: "Koefisien b", schema: { type: "number", example: -3 } },
            { name: "c", in: "query", required: true, description: "Koefisien c", schema: { type: "number", example: 2 } },
        ],
        responses: { "200": { description: "Solusi persamaan kuadrat" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const a = parseFloat(req.query.a)
        const b = parseFloat(req.query.b)
        const c = parseFloat(req.query.c)
        if (isNaN(a) || isNaN(b) || isNaN(c)) return res.status(400).json({ ok: false, error: "a, b, c wajib angka" })
        if (a === 0) return res.status(400).json({ ok: false, error: "a tidak boleh 0 (bukan persamaan kuadrat)" })
        const disc = b * b - 4 * a * c
        const eq = `${a}x² + ${b}x + ${c} = 0`.replace("+ -", "- ")
        if (disc > 0) {
            const sqrtD = Math.sqrt(disc)
            const x1 = (-b + sqrtD) / (2 * a)
            const x2 = (-b - sqrtD) / (2 * a)
            res.json({ ok: true, equation: eq, discriminant: disc, type: "two_real_roots", x1, x2 })
        } else if (disc === 0) {
            const x = -b / (2 * a)
            res.json({ ok: true, equation: eq, discriminant: 0, type: "one_real_root", x1: x, x2: x })
        } else {
            const sqrtD = Math.sqrt(-disc)
            const real = -b / (2 * a)
            const imag = sqrtD / (2 * a)
            res.json({
                ok: true,
                equation: eq,
                discriminant: disc,
                type: "two_complex_roots",
                x1: `${real} + ${imag}i`,
                x2: `${real} - ${imag}i`,
                x1_real: real, x1_imag: imag,
                x2_real: real, x2_imag: -imag,
            })
        }
    },
}

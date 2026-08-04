// /utils/bitwise — bitwise operations
const OPS = ["and", "or", "xor", "not", "left_shift", "right_shift", "right_shift_unsigned"]

export default {
    route: {
        method: "get",
        path: "/utils/bitwise",
        auth: false,
        tags: ["Utils"],
        summary: "Bitwise operations",
        description: "Operasi bitwise: AND, OR, XOR, NOT, <<, >>, >>> antara dua bilangan bulat.",
        parameters: [
            { name: "a", in: "query", required: true, description: "Bilangan pertama", schema: { type: "integer", example: 12 } },
            { name: "b", in: "query", required: false, description: "Bilangan kedua (tidak wajib untuk NOT)", schema: { type: "integer", example: 10 } },
            { name: "op", in: "query", required: true, description: "Operasi", schema: { type: "string", enum: OPS, example: "and" } },
        ],
        responses: { "200": { description: "Hasil bitwise" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const op = String(req.query.op)
        if (!OPS.includes(op)) return res.status(400).json({ ok: false, error: "op tidak valid" })
        const a = parseInt(req.query.a, 10)
        if (isNaN(a)) return res.status(400).json({ ok: false, error: "a wajib angka bulat" })
        const b = parseInt(req.query.b, 10)
        if (op !== "not" && isNaN(b)) return res.status(400).json({ ok: false, error: "b wajib angka bulat" })
        let result, formula
        switch (op) {
            case "and": result = a & b; formula = `${a} & ${b}`; break
            case "or": result = a | b; formula = `${a} | ${b}`; break
            case "xor": result = a ^ b; formula = `${a} ^ ${b}`; break
            case "not": result = ~a; formula = `~${a}`; break
            case "left_shift": result = a << b; formula = `${a} << ${b}`; break
            case "right_shift": result = a >> b; formula = `${a} >> ${b}`; break
            case "right_shift_unsigned": result = a >>> b; formula = `${a} >>> ${b}`; break
        }
        res.json({
            ok: true,
            op,
            formula,
            result,
            result_hex: "0x" + (result >>> 0).toString(16).toUpperCase(),
            result_bin: (result >>> 0).toString(2),
            result_dec: (result >>> 0),
        })
    },
}

// /utils/modular-arithmetic — Modular arithmetic operations
function modPow(base, exp, m) {
    base = BigInt(base); exp = BigInt(exp); m = BigInt(m)
    if (m === 1n) return 0n
    let result = 1n
    base = base % m
    if (base < 0n) base += m
    while (exp > 0n) {
        if (exp % 2n === 1n) result = (result * base) % m
        exp = exp / 2n
        base = (base * base) % m
    }
    return result
}

function modInverse(a, m) {
    a = BigInt(a); m = BigInt(m)
    a = ((a % m) + m) % m
    for (let x = 1n; x < m; x++) {
        if ((a * x) % m === 1n) return x
    }
    return null
}

function gcd(a, b) {
    a = BigInt(a); b = BigInt(b)
    while (b) { [a, b] = [b, a % b] }
    return a < 0n ? -a : a
}

export default {
    route: {
        method: "get",
        path: "/utils/modular-arithmetic",
        auth: false,
        tags: ["Utils"],
        summary: "Modular arithmetic (add, sub, mul, pow, inverse)",
        description: "Operasi aritmatika modular: add, sub, mul, pow, inverse, gcd. Mendukung bilangan besar.",
        parameters: [
            { name: "a", in: "query", required: true, description: "Bilangan a", schema: { type: "string", example: "7" } },
            { name: "b", in: "query", required: false, description: "Bilangan b (untuk add/sub/mul)", schema: { type: "string", example: "3" } },
            { name: "m", in: "query", required: true, description: "Modulus", schema: { type: "string", example: "11" } },
            { name: "op", in: "query", required: false, description: "Operasi", schema: { type: "string", enum: ["add", "sub", "mul", "pow", "inverse", "gcd"], default: "pow" } },
        ],
        responses: { "200": { description: "Hasil operasi modular" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        try {
            const a = String(req.query.a || "")
            const m = String(req.query.m || "")
            if (!a || !m) return res.status(400).json({ ok: false, error: "a dan m wajib diisi" })
            const op = String(req.query.op || "pow").toLowerCase()
            let result
            switch (op) {
                case "add":
                    if (!req.query.b) return res.status(400).json({ ok: false, error: "b wajib untuk op add" })
                    result = ((BigInt(a) + BigInt(req.query.b)) % BigInt(m) + BigInt(m)) % BigInt(m)
                    break
                case "sub":
                    if (!req.query.b) return res.status(400).json({ ok: false, error: "b wajib untuk op sub" })
                    result = ((BigInt(a) - BigInt(req.query.b)) % BigInt(m) + BigInt(m)) % BigInt(m)
                    break
                case "mul":
                    if (!req.query.b) return res.status(400).json({ ok: false, error: "b wajib untuk op mul" })
                    result = ((BigInt(a) * BigInt(req.query.b)) % BigInt(m) + BigInt(m)) % BigInt(m)
                    break
                case "pow":
                    if (!req.query.b) return res.status(400).json({ ok: false, error: "b (exponent) wajib untuk op pow" })
                    result = modPow(a, req.query.b, m)
                    break
                case "inverse": {
                    const inv = modInverse(a, m)
                    if (inv === null) return res.status(400).json({ ok: false, error: "inverse tidak ada (a dan m tidak koprima)" })
                    result = inv
                    break
                }
                case "gcd":
                    if (!req.query.b) return res.status(400).json({ ok: false, error: "b wajib untuk op gcd" })
                    result = gcd(a, req.query.b)
                    break
                default:
                    return res.status(400).json({ ok: false, error: "op tidak valid" })
            }
            res.json({
                ok: true,
                op,
                a,
                b: req.query.b,
                m,
                result: result.toString(),
            })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

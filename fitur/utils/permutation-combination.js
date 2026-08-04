// /utils/permutation-combination — nPr and nCr
function factorial(n) {
    let r = 1n
    for (let i = 2n; i <= BigInt(n); i++) r *= i
    return r
}
function nPr(n, r) {
    if (r > n) return 0n
    return factorial(n) / factorial(n - r)
}
function nCr(n, r) {
    if (r > n) return 0n
    if (r > n - r) r = n - r
    let result = 1n
    for (let i = 0; i < r; i++) result = result * BigInt(n - i) / BigInt(i + 1)
    return result
}

export default {
    route: {
        method: "get",
        path: "/utils/permutation-combination",
        auth: false,
        tags: ["Utils"],
        summary: "Permutation (nPr) & Combination (nCr)",
        description: "Menghitung permutasi nPr dan kombinasi nCr sekaligus.",
        parameters: [
            { name: "n", in: "query", required: true, description: "Total items", schema: { type: "integer", example: 10 } },
            { name: "r", in: "query", required: true, description: "Items terpilih", schema: { type: "integer", example: 3 } },
        ],
        responses: { "200": { description: "Hasil nPr dan nCr" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const n = parseInt(req.query.n)
        const r = parseInt(req.query.r)
        if (isNaN(n) || isNaN(r)) return res.status(400).json({ ok: false, error: "n dan r wajib diisi (integer)" })
        if (n < 0 || r < 0) return res.status(400).json({ ok: false, error: "n dan r harus >= 0" })
        if (n > 500) return res.status(400).json({ ok: false, error: "maksimum n=500" })
        try {
            res.json({
                ok: true,
                n, r,
                nPr: nPr(n, r).toString(),
                nCr: nCr(n, r).toString(),
                formula: { nPr: `n!/(n-r)! = ${n}!/(${n}-${r})!`, nCr: `n!/(r!(n-r)!) = ${n}!/(${r}!·${n - r}!)` },
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

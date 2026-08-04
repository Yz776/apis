// /utils/binomial-coefficient — nCr (binomial coefficient)
function nCr(n, k) {
    if (k < 0 || k > n) return 0n
    if (k === 0 || k === n) return 1n
    k = Math.min(k, n - k)
    let result = 1n
    for (let i = 0; i < k; i++) {
        result = result * BigInt(n - i) / BigInt(i + 1)
    }
    return result
}

export default {
    route: {
        method: "get",
        path: "/utils/binomial-coefficient",
        auth: false,
        tags: ["Utils"],
        summary: "Binomial coefficient (nCr)",
        description: "Menghitung koefisien binomial C(n,k) = n!/(k!(n-k)!). Mendukung bilangan besar.",
        parameters: [
            { name: "n", in: "query", required: true, description: "Total", schema: { type: "integer", example: 10 } },
            { name: "k", in: "query", required: true, description: "Pilih", schema: { type: "integer", example: 3 } },
        ],
        responses: { "200": { description: "Hasil nCr" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const n = parseInt(req.query.n)
        const k = parseInt(req.query.k)
        if (isNaN(n) || isNaN(k)) return res.status(400).json({ ok: false, error: "n dan k wajib diisi (integer)" })
        if (n < 0 || k < 0) return res.status(400).json({ ok: false, error: "n dan k harus >= 0" })
        if (n > 1000) return res.status(400).json({ ok: false, error: "maksimum n=1000" })
        try {
            const result = nCr(n, k)
            res.json({ ok: true, n, k, nCr: result.toString(), formula: `C(${n},${k}) = ${n}!/(${k}!·${n - k}!)` })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

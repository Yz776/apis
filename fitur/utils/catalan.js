// /utils/catalan — Catalan numbers
function catalan(n) {
    if (n < 0) return 0n
    if (n === 0) return 1n
    // C_n = (2n)! / ((n+1)! * n!)
    let result = 1n
    for (let i = 0; i < n; i++) {
        result = result * BigInt(2 * n - i) / BigInt(i + 1)
    }
    return result / BigInt(n + 1)
}

export default {
    route: {
        method: "get",
        path: "/utils/catalan",
        auth: false,
        tags: ["Utils"],
        summary: "Catalan numbers",
        description: "Menghasilkan bilangan Catalan. C_n = (2n)!/((n+1)!·n!). Default: kembalikan deret atau nilai ke-n.",
        parameters: [
            { name: "n", in: "query", required: false, description: "Index (jika kosong, kembalikan deret 0..20)", schema: { type: "integer", example: 5 } },
        ],
        responses: { "200": { description: "Hasil Catalan" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        try {
            if (req.query.n !== undefined) {
                const n = parseInt(req.query.n)
                if (isNaN(n) || n < 0) return res.status(400).json({ ok: false, error: "n harus >= 0" })
                if (n > 200) return res.status(400).json({ ok: false, error: "maksimum n=200" })
                return res.json({ ok: true, n, catalan: catalan(n).toString() })
            }
            // return first 21
            const seq = []
            for (let i = 0; i <= 20; i++) seq.push(catalan(i).toString())
            res.json({ ok: true, sequence: seq, indices: seq.map((_, i) => i) })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

// /utils/prime-factorization — Prime factorization of an integer
function factorize(n) {
    if (n < 2n) return []
    const factors = []
    let num = n
    let divisor = 2n
    while (divisor * divisor <= num) {
        while (num % divisor === 0n) {
            factors.push(divisor)
            num = num / divisor
        }
        divisor += 1n
        if (divisor > 1000000n && num > 1n) {
            // safety break for very large primes
            if (num > 1n) factors.push(num)
            return factors
        }
    }
    if (num > 1n) factors.push(num)
    return factors
}

export default {
    route: {
        method: "get",
        path: "/utils/prime-factorization",
        auth: false,
        tags: ["Utils"],
        summary: "Prime factorization",
        description: "Menguraikan bilangan menjadi faktor-faktor primanya. Mendukung bilangan besar.",
        parameters: [
            { name: "n", in: "query", required: true, description: "Bilangan bulat positif", schema: { type: "string", example: "123456789" } },
        ],
        responses: { "200": { description: "Faktor prima" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const nStr = String(req.query.n || "")
        if (!nStr) return res.status(400).json({ ok: false, error: "n wajib diisi" })
        let n
        try { n = BigInt(nStr) } catch { return res.status(400).json({ ok: false, error: "n harus bilangan bulat" }) }
        if (n < 0n) return res.status(400).json({ ok: false, error: "n harus positif" })
        try {
            const factors = factorize(n)
            const unique = [...new Set(factors)]
            const summary = {}
            for (const f of factors) summary[f.toString()] = (summary[f.toString()] || 0) + 1
            const factorization = Object.entries(summary).map(([p, e]) => e === 1 ? p : `${p}^${e}`).join(" * ")
            res.json({
                ok: true,
                input: n.toString(),
                factors: factors.map(f => f.toString()),
                unique_factors: unique.map(f => f.toString()),
                summary,
                factorization: factorization || "1",
                is_prime: factors.length === 1,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

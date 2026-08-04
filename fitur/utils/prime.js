// /utils/prime — Prime number checker & lister
function isPrime(n) {
    if (n < 2) return false
    if (n < 4) return true
    if (n % 2 === 0) return false
    for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false
    return true
}
function nextPrime(n) { let k = n + 1; while (!isPrime(k)) k++; return k }
function prevPrime(n) { let k = n - 1; while (k >= 2 && !isPrime(k)) k--; return k >= 2 ? k : null }
function factorize(n) {
    const f = {}
    let d = 2
    while (n > 1) {
        while (n % d === 0) { f[d] = (f[d] || 0) + 1; n = Math.floor(n / d) }
        d++
        if (d * d > n && n > 1) { f[n] = (f[n] || 0) + 1; break }
    }
    return f
}

export default {
    route: {
        method: "get",
        path: "/utils/prime",
        auth: false,
        tags: ["Utils"],
        summary: "Prime number tools",
        description: "Cek apakah suatu bilangan prima, sekaligus tampilkan prima sekitarnya dan faktorisasi.",
        parameters: [
            { name: "n", in: "query", required: true, description: "Bilangan yang dicek (integer 1-1e12)", schema: { type: "integer", example: 97 } },
        ],
        responses: { "200": { description: "Hasil cek prima" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const n = parseInt(req.query.n, 10)
        if (!Number.isInteger(n) || n < 1 || n > 1e12) return res.status(400).json({ ok: false, error: "n harus integer 1-1000000000000" })
        const prime = isPrime(n)
        const out = { ok: true, n, is_prime: prime }
        if (!prime && n > 1) out.factors = factorize(n)
        if (n >= 2) {
            const prev = prevPrime(n)
            const next = nextPrime(n)
            out.prev_prime = prev
            out.next_prime = next
        }
        res.json(out)
    },
}

// /utils/perfect-number — Perfect number check & generator
function isPerfect(n) {
    if (n < 2n) return false
    let sum = 1n
    const sqrt = BigInt(Math.floor(Math.sqrt(Number(n))))
    for (let i = 2n; i * i <= n && i < 1000000n; i++) {
        if (n % i === 0n) {
            sum += i
            const other = n / i
            if (other !== i) sum += other
        }
    }
    return sum === n
}

const KNOWN_PERFECT = [6n, 28n, 496n, 8128n, 33550336n, 8589869056n, 137438691328n]

export default {
    route: {
        method: "get",
        path: "/utils/perfect-number",
        auth: false,
        tags: ["Utils"],
        summary: "Perfect number check & list",
        description: "Memeriksa apakah suatu bilangan adalah perfect number (jumlah faktor selain dirinya = bilangan itu sendiri). Contoh: 6 = 1+2+3.",
        parameters: [
            { name: "n", in: "query", required: false, description: "Bilangan yang diperiksa (jika kosong, kembalikan daftar perfect numbers)", schema: { type: "string", example: "28" } },
            { name: "list", in: "query", required: false, description: "Jika true, kembalikan 7 perfect numbers pertama yang diketahui", schema: { type: "boolean", default: false } },
        ],
        responses: { "200": { description: "Hasil" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        try {
            if (req.query.list === "true" || req.query.list === "1") {
                return res.json({ ok: true, perfect_numbers: KNOWN_PERFECT.map(n => n.toString()) })
            }
            const nStr = String(req.query.n || "")
            if (!nStr) return res.status(400).json({ ok: false, error: "n wajib diisi (atau set list=true)" })
            if (!/^\d+$/.test(nStr)) return res.status(400).json({ ok: false, error: "n harus bilangan bulat positif" })
            const n = BigInt(nStr)
            const result = isPerfect(n)
            // collect divisors
            const divisors = [1n]
            for (let i = 2n; i * i <= n && i < 1000000n; i++) {
                if (n % i === 0n) {
                    divisors.push(i)
                    const other = n / i
                    if (other !== i && other !== n) divisors.push(other)
                }
            }
            divisors.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
            const sum = divisors.reduce((a, b) => a + b, 0n)
            res.json({
                ok: true,
                input: n.toString(),
                is_perfect: result,
                divisors: divisors.map(d => d.toString()),
                sum_of_divisors: sum.toString(),
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

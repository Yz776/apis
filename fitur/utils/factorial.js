// /utils/factorial — Factorial calculator (with big number support via BigInt)
export default {
    route: {
        method: "get",
        path: "/utils/factorial",
        auth: false,
        tags: ["Utils"],
        summary: "Factorial calculator",
        description: "Menghitung faktorial n! (1-1000) menggunakan BigInt untuk presisi tak terbatas.",
        parameters: [
            { name: "n", in: "query", required: true, description: "Bilangan (0-1000)", schema: { type: "integer", example: 10 } },
        ],
        responses: { "200": { description: "Hasil faktorial" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const n = parseInt(req.query.n, 10)
        if (!Number.isInteger(n) || n < 0 || n > 1000) return res.status(400).json({ ok: false, error: "n harus integer 0-1000" })
        let r = 1n
        for (let i = 2n; i <= BigInt(n); i++) r *= i
        const str = r.toString()
        res.json({ ok: true, n, factorial: str, digits: str.length })
    },
}

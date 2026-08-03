// /utils/fibonacci — Fibonacci sequence
export default {
    route: {
        method: "get",
        path: "/utils/fibonacci",
        auth: false,
        tags: ["Utils"],
        summary: "Fibonacci sequence",
        description: "Menghasilkan deret Fibonacci. count=N mengembalikan N suku pertama; at=N mengembalikan suku ke-N (0-indexed).",
        parameters: [
            { name: "count", in: "query", required: false, description: "Jumlah suku yang dikembalikan (1-1000, default 10)", schema: { type: "integer", default: 10, example: 15 } },
            { name: "at", in: "query", required: false, description: "Hanya ambil suku ke-N (0-10000)", schema: { type: "integer", example: 100 } },
        ],
        responses: { "200": { description: "Deret Fibonacci" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        if (req.query.at !== undefined) {
            const n = parseInt(req.query.at, 10)
            if (!Number.isInteger(n) || n < 0 || n > 10000) return res.status(400).json({ ok: false, error: "at harus integer 0-10000" })
            let a = 0n, b = 1n
            for (let i = 0; i < n; i++) { [a, b] = [b, a + b] }
            const s = a.toString()
            return res.json({ ok: true, at: n, value: s, digits: s.length })
        }
        let count = parseInt(req.query.count, 10) || 10
        if (count < 1) count = 1
        if (count > 1000) count = 1000
        const arr = []
        let a = 0n, b = 1n
        for (let i = 0; i < count; i++) { arr.push(a.toString()); [a, b] = [b, a + b] }
        res.json({ ok: true, count, sequence: arr })
    },
}

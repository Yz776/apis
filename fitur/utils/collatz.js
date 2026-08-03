// /utils/collatz — Collatz conjecture sequence
function collatz(n, maxSteps = 1000) {
    const seq = [n]
    let cur = n
    let steps = 0
    while (cur > 1n && steps < maxSteps) {
        if (cur % 2n === 0n) cur = cur / 2n
        else cur = 3n * cur + 1n
        seq.push(cur)
        steps++
    }
    return { sequence: seq, steps, reached_one: cur === 1n }
}

export default {
    route: {
        method: "get",
        path: "/utils/collatz",
        auth: false,
        tags: ["Utils"],
        summary: "Collatz conjecture sequence",
        description: "Menghasilkan deret Collatz (3n+1). Setiap bilangan positif akan mencapai 1 menurut konjektur.",
        parameters: [
            { name: "n", in: "query", required: true, description: "Bilangan awal (positif)", schema: { type: "string", example: "27" } },
            { name: "maxSteps", in: "query", required: false, description: "Maksimum langkah (default 1000)", schema: { type: "integer", default: 1000 } },
        ],
        responses: { "200": { description: "Deret Collatz" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const nStr = String(req.query.n || "")
        if (!nStr) return res.status(400).json({ ok: false, error: "n wajib diisi" })
        if (!/^\d+$/.test(nStr)) return res.status(400).json({ ok: false, error: "n harus bilangan bulat positif" })
        try {
            const n = BigInt(nStr)
            if (n < 1n) return res.status(400).json({ ok: false, error: "n harus >= 1" })
            const maxSteps = Math.min(10000, parseInt(req.query.maxSteps) || 1000)
            const { sequence, steps, reached_one } = collatz(n, maxSteps)
            const max = sequence.reduce((a, b) => (a > b ? a : b))
            res.json({
                ok: true,
                input: n.toString(),
                sequence: sequence.map(s => s.toString()),
                steps,
                reached_one: reached_one,
                max_value: max.toString(),
                truncated: !reached_one,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

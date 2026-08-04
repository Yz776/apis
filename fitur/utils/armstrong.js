// /utils/armstrong — Armstrong number check
function isArmstrong(n) {
    const str = n.toString()
    const power = str.length
    let sum = 0n
    for (const ch of str) {
        const d = BigInt(parseInt(ch, 10))
        let p = 1n
        for (let i = 0; i < power; i++) p *= d
        sum += p
    }
    return sum === n
}

export default {
    route: {
        method: "get",
        path: "/utils/armstrong",
        auth: false,
        tags: ["Utils"],
        summary: "Armstrong number check",
        description: "Memeriksa apakah suatu bilangan adalah Armstrong number (jumlah digit pangkat panjang digit = bilangan itu sendiri). Contoh: 153 = 1^3 + 5^3 + 3^3.",
        parameters: [
            { name: "n", in: "query", required: true, description: "Bilangan yang diperiksa", schema: { type: "string", example: "153" } },
        ],
        responses: { "200": { description: "Hasil pengecekan" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const nStr = String(req.query.n || "")
        if (!nStr) return res.status(400).json({ ok: false, error: "n wajib diisi" })
        if (!/^\d+$/.test(nStr)) return res.status(400).json({ ok: false, error: "n harus bilangan bulat positif" })
        try {
            const n = BigInt(nStr)
            const result = isArmstrong(n)
            const detail = n.toString().split("").map(d => `${d}^${n.toString().length}`).join(" + ")
            res.json({
                ok: true,
                input: n.toString(),
                is_armstrong: result,
                detail: `${detail} = ${n.toString().split("").reduce((s, d) => s + BigInt(parseInt(d, 10)) ** BigInt(n.toString().length), 0n).toString()}`,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

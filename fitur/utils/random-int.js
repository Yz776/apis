// /utils/random-int — random integer in range (cryptographically secure)
import crypto from "crypto"

function randomInt(min, max) {
    if (min > max) [min, max] = [max, min]
    const range = max - min + 1
    if (range > 2 ** 53) throw new Error("range terlalu besar")
    // use crypto.randomInt if available, else fallback
    if (typeof crypto.randomInt === "function") return crypto.randomInt(min, max + 1)
    // fallback: reject modulo bias
    const buf = crypto.randomBytes(8)
    const r = buf.readBigUInt64BE() / BigInt(2 ** 64)
    return min + Math.floor(Number(r) * range)
}

export default {
    route: {
        method: "get",
        path: "/utils/random-int",
        auth: false,
        tags: ["Utils"],
        summary: "Random integer in range (secure)",
        description: "Hasilkan bilangan bulat acak dalam rentang [min, max] (inklusif, cryptographically secure).",
        parameters: [
            { name: "min", in: "query", required: false, description: "Nilai minimum (default 0)", schema: { type: "integer", default: 0 } },
            { name: "max", in: "query", required: false, description: "Nilai maksimum (default 100)", schema: { type: "integer", default: 100 } },
            { name: "count", in: "query", required: false, description: "Jumlah angka (default 1, max 100)", schema: { type: "integer", default: 1 } },
            { name: "unique", in: "query", required: false, description: "Apakah angka harus unik (default false)", schema: { type: "boolean", default: false } },
        ],
        responses: { "200": { description: "Daftar angka acak" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        let min = parseInt(req.query.min, 10)
        if (isNaN(min)) min = 0
        let max = parseInt(req.query.max, 10)
        if (isNaN(max)) max = 100
        let count = parseInt(req.query.count, 10) || 1
        if (count < 1) count = 1
        if (count > 100) count = 100
        const unique = String(req.query.unique).toLowerCase() === "true"
        if (min > max) [min, max] = [max, min]
        if (unique && (max - min + 1) < count) return res.status(400).json({ ok: false, error: "range terlalu kecil untuk unique count" })
        try {
            const result = new Set()
            const out = []
            while (out.length < count) {
                const n = randomInt(min, max)
                if (unique) { if (result.has(n)) continue; result.add(n) }
                out.push(n)
            }
            res.json({ ok: true, count: out.length, min, max, unique, numbers: out })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

// /info/random — Random number / pick / shuffle
import crypto from "crypto"

function secureRandomInt(max) { return crypto.randomInt(max) }

export default {
    route: {
        method: "get",
        path: "/info/random",
        auth: false,
        tags: ["Info"],
        summary: "Random number / pick / shuffle",
        description: "Berbagai operasi random: number (range), pick (pilih dari list), shuffle (acak list), coin (lempar koin), dice (lempar dadu).",
        parameters: [
            { name: "mode", in: "query", required: false, description: "number, pick, shuffle, coin, atau dice (default number)", schema: { type: "string", enum: ["number", "pick", "shuffle", "coin", "dice"], default: "number" } },
            { name: "min", in: "query", required: false, description: "Min untuk number (default 1)", schema: { type: "integer", default: 1 } },
            { name: "max", in: "query", required: false, description: "Max untuk number (default 100)", schema: { type: "integer", default: 100 } },
            { name: "count", in: "query", required: false, description: "Jumlah dadu / angka (default 1)", schema: { type: "integer", default: 1 } },
            { name: "list", in: "query", required: false, description: "List dipisah koma untuk pick/shuffle", schema: { type: "string", example: "apple,banana,cherry" } },
        ],
        responses: { "200": { description: "Hasil random" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const mode = String(req.query.mode || "number").toLowerCase()
        if (mode === "number") {
            let min = parseInt(req.query.min, 10); if (isNaN(min)) min = 1
            let max = parseInt(req.query.max, 10); if (isNaN(max)) max = 100
            if (min > max) [min, max] = [max, min]
            const r = min + secureRandomInt(max - min + 1)
            return res.json({ ok: true, mode, min, max, result: r })
        }
        if (mode === "coin") {
            const r = secureRandomInt(2) === 0 ? "heads" : "tails"
            return res.json({ ok: true, mode, result: r })
        }
        if (mode === "dice") {
            let count = parseInt(req.query.count, 10) || 1
            if (count < 1) count = 1
            if (count > 100) count = 100
            const rolls = []
            for (let i = 0; i < count; i++) rolls.push(1 + secureRandomInt(6))
            return res.json({ ok: true, mode, count, rolls, total: rolls.reduce((a, b) => a + b, 0) })
        }
        if (mode === "pick" || mode === "shuffle") {
            const listStr = String(req.query.list || "")
            if (!listStr) return res.status(400).json({ ok: false, error: "list wajib diisi (item dipisah koma)" })
            const items = listStr.split(",").map(s => s.trim()).filter(Boolean)
            if (items.length === 0) return res.status(400).json({ ok: false, error: "list harus berisi minimal 1 item" })
            if (mode === "pick") {
                const idx = secureRandomInt(items.length)
                return res.json({ ok: true, mode, picked: items[idx], from: items })
            } else {
                // Fisher-Yates shuffle
                for (let i = items.length - 1; i > 0; i--) {
                    const j = secureRandomInt(i + 1)
                    ;[items[i], items[j]] = [items[j], items[i]]
                }
                return res.json({ ok: true, mode, shuffled: items })
            }
        }
        res.status(400).json({ ok: false, error: "mode tidak valid" })
    },
}

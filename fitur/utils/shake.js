// /utils/shake — SHAKE128/256 hash generator
import crypto from "crypto"
const ALGOS = ["shake128", "shake256"]

export default {
    route: {
        method: "get",
        path: "/utils/shake",
        auth: false,
        tags: ["Utils"],
        summary: "SHAKE128/256 hash generator (extendable output)",
        description: "Menghasilkan SHAKE hash dengan output length yang dapat dikustomisasi.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "hello" } },
            { name: "algo", in: "query", required: false, description: "Algoritma (default shake128)", schema: { type: "string", enum: ALGOS, default: "shake128" } },
            { name: "length", in: "query", required: false, description: "Panjang output dalam bytes (default 32)", schema: { type: "integer", default: 32, minimum: 1, maximum: 1024 } },
        ],
        responses: { "200": { description: "SHAKE hash" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const algo = String(req.query.algo || "shake128").toLowerCase()
        if (!ALGOS.includes(algo)) return res.status(400).json({ ok: false, error: `algo tidak valid, pilih: ${ALGOS.join(", ")}` })
        const len = Math.min(1024, Math.max(1, parseInt(req.query.length) || 32))
        try {
            const hash = crypto.createHash(algo, { outputLength: len }).update(String(text), "utf8").digest("hex")
            res.json({ ok: true, algo, input: String(text), length: len, hash })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

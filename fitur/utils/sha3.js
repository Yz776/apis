// /utils/sha3 — SHA3 hash generator
import crypto from "crypto"
const ALGOS = ["sha3-224", "sha3-256", "sha3-384", "sha3-512"]

export default {
    route: {
        method: "get",
        path: "/utils/sha3",
        auth: false,
        tags: ["Utils"],
        summary: "SHA3 hash generator (224/256/384/512)",
        description: "Menghasilkan SHA3 hash dari teks. Mendukung sha3-224, sha3-256, sha3-384, sha3-512.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks yang akan dihash", schema: { type: "string", example: "hello world" } },
            { name: "algo", in: "query", required: false, description: "Algoritma (default sha3-256)", schema: { type: "string", enum: ALGOS, default: "sha3-256" } },
        ],
        responses: { "200": { description: "SHA3 hash" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const algo = String(req.query.algo || "sha3-256").toLowerCase()
        if (!ALGOS.includes(algo)) return res.status(400).json({ ok: false, error: `algo tidak valid, pilih: ${ALGOS.join(", ")}` })
        try {
            const hash = crypto.createHash(algo).update(String(text), "utf8").digest("hex")
            res.json({ ok: true, algo, input: String(text), hash, length: hash.length })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

// /utils/hash — MD5/SHA1/SHA256/SHA512 hash generator
import crypto from "crypto"

const ALGOS = ["md5", "sha1", "sha256", "sha512"]

export default {
    route: {
        method: "get",
        path: "/utils/hash",
        auth: false,
        tags: ["Utils"],
        summary: "Hash generator (MD5/SHA1/SHA256/SHA512)",
        description: "Menghasilkan hash dari teks menggunakan algoritma yang dipilih. Mendukung md5, sha1, sha256, sha512.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks yang akan dihash", schema: { type: "string", example: "halo dunia" } },
            { name: "algo", in: "query", required: false, description: "Algoritma hash (default sha256)", schema: { type: "string", enum: ALGOS, default: "sha256" } },
        ],
        responses: { "200": { description: "Hash hasil" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const algo = String(req.query.algo || "sha256").toLowerCase()
        if (!ALGOS.includes(algo)) return res.status(400).json({ ok: false, error: `algo tidak valid, pilih: ${ALGOS.join(", ")}` })
        try {
            const hash = crypto.createHash(algo).update(String(text), "utf8").digest("hex")
            res.json({ ok: true, algo, input: String(text), hash, length: hash.length })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

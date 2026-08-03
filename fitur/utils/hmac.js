// /utils/hmac — HMAC generator
import crypto from "crypto"

const ALGOS = ["md5", "sha1", "sha256", "sha512"]

export default {
    route: {
        method: "get",
        path: "/utils/hmac",
        auth: false,
        tags: ["Utils"],
        summary: "HMAC generator (MD5/SHA1/SHA256/SHA512)",
        description: "Hasilkan HMAC dari teks dengan kunci rahasia. Mendukung md5, sha1, sha256, sha512.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks yang akan di-HMAC", schema: { type: "string", example: "halo dunia" } },
            { name: "key", in: "query", required: true, description: "Kunci rahasia", schema: { type: "string", example: "s3cr3t" } },
            { name: "algo", in: "query", required: false, description: "Algoritma hash (default sha256)", schema: { type: "string", enum: ALGOS, default: "sha256" } },
            { name: "encoding", in: "query", required: false, description: "Encoding output (hex/base64, default hex)", schema: { type: "string", enum: ["hex", "base64"], default: "hex" } },
        ],
        responses: { "200": { description: "HMAC hasil" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const { text, key } = req.query
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        if (!key) return res.status(400).json({ ok: false, error: "key wajib diisi" })
        const algo = String(req.query.algo || "sha256").toLowerCase()
        if (!ALGOS.includes(algo)) return res.status(400).json({ ok: false, error: "algo tidak valid" })
        const encoding = String(req.query.encoding || "hex").toLowerCase()
        if (!["hex", "base64"].includes(encoding)) return res.status(400).json({ ok: false, error: "encoding harus hex atau base64" })
        const hmac = crypto.createHmac(algo, String(key)).update(String(text), "utf8").digest(encoding)
        res.json({ ok: true, algo, input: String(text), hmac })
    },
}

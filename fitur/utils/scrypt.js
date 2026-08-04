// /utils/scrypt — scrypt key derivation
import crypto from "crypto"

export default {
    route: {
        method: "get",
        path: "/utils/scrypt",
        auth: false,
        tags: ["Utils"],
        summary: "scrypt key derivation",
        description: "Turunkan kunci dari password menggunakan scrypt (KDF yang tahan GPU/ASIC).",
        parameters: [
            { name: "password", in: "query", required: true, description: "Password input", schema: { type: "string", example: "s3cr3t" } },
            { name: "salt", in: "query", required: false, description: "Salt (jika kosong, generate random 16 byte)", schema: { type: "string" } },
            { name: "keylen", in: "query", required: false, description: "Panjang kunci byte (default 32)", schema: { type: "integer", default: 32 } },
            { name: "N", in: "query", required: false, description: "CPU/memory cost (default 16384)", schema: { type: "integer", default: 16384 } },
            { name: "r", in: "query", required: false, description: "Block size (default 8)", schema: { type: "integer", default: 8 } },
            { name: "p", in: "query", required: false, description: "Parallelization (default 1)", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "Derived key" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const password = req.query.password
        if (!password) return res.status(400).json({ ok: false, error: "password wajib diisi" })
        let keylen = parseInt(req.query.keylen, 10) || 32
        if (keylen < 1) keylen = 1
        if (keylen > 512) keylen = 512
        let N = parseInt(req.query.N, 10) || 16384
        let r = parseInt(req.query.r, 10) || 8
        let p = parseInt(req.query.p, 10) || 1
        // safety: cap N to avoid DoS
        if (N > 65536) N = 65536
        if (r > 16) r = 16
        if (p > 4) p = 4
        const saltBuf = req.query.salt
            ? Buffer.from(String(req.query.salt), "utf8")
            : crypto.randomBytes(16)
        try {
            const derived = crypto.scryptSync(String(password), saltBuf, keylen, { N, r, p, maxmem: 64 * 1024 * 1024 })
            res.json({
                ok: true,
                password: String(password),
                salt: saltBuf.toString("hex"),
                N, r, p, keylen,
                derived_hex: derived.toString("hex"),
                derived_base64: derived.toString("base64"),
            })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

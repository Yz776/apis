// /utils/pbkdf2 — PBKDF2 key derivation
import crypto from "crypto"

const ALGOS = ["sha1", "sha256", "sha512"]

export default {
    route: {
        method: "get",
        path: "/utils/pbkdf2",
        auth: false,
        tags: ["Utils"],
        summary: "PBKDF2 key derivation",
        description: "Turunkan kunci dari password menggunakan PBKDF2 dengan salt acak. Output hex/base64.",
        parameters: [
            { name: "password", in: "query", required: true, description: "Password input", schema: { type: "string", example: "s3cr3t" } },
            { name: "salt", in: "query", required: false, description: "Salt (jika kosong, generate random 16 byte)", schema: { type: "string" } },
            { name: "iterations", in: "query", required: false, description: "Jumlah iterasi (default 100000)", schema: { type: "integer", default: 100000, example: 100000 } },
            { name: "keylen", in: "query", required: false, description: "Panjang kunci byte (default 32)", schema: { type: "integer", default: 32 } },
            { name: "algo", in: "query", required: false, description: "Algoritma digest (default sha512)", schema: { type: "string", enum: ALGOS, default: "sha512" } },
        ],
        responses: { "200": { description: "Derived key" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const password = req.query.password
        if (!password) return res.status(400).json({ ok: false, error: "password wajib diisi" })
        const algo = String(req.query.algo || "sha512").toLowerCase()
        if (!ALGOS.includes(algo)) return res.status(400).json({ ok: false, error: "algo tidak valid" })
        let iter = parseInt(req.query.iterations, 10) || 100000
        if (iter < 1) iter = 1
        if (iter > 1000000) iter = 1000000
        let keylen = parseInt(req.query.keylen, 10) || 32
        if (keylen < 1) keylen = 1
        if (keylen > 512) keylen = 512
        const saltBuf = req.query.salt
            ? Buffer.from(String(req.query.salt), "utf8")
            : crypto.randomBytes(16)
        try {
            const derived = crypto.pbkdf2Sync(String(password), saltBuf, iter, keylen, algo)
            res.json({
                ok: true,
                password: String(password),
                salt: saltBuf.toString("hex"),
                iterations: iter,
                keylen,
                algo,
                derived_hex: derived.toString("hex"),
                derived_base64: derived.toString("base64"),
            })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

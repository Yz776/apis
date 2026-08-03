// /utils/aes — AES-256-CBC encrypt/decrypt (PKCS7 padding)
import crypto from "crypto"

function deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, "sha512")
}

function encrypt(plain, password) {
    const iv = crypto.randomBytes(16)
    const salt = crypto.randomBytes(16)
    const key = deriveKey(password, salt)
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
    return Buffer.concat([salt, iv, enc]).toString("base64")
}

function decrypt(b64, password) {
    const buf = Buffer.from(b64, "base64")
    if (buf.length < 33) throw new Error("input terlalu pendek")
    const salt = buf.subarray(0, 16)
    const iv = buf.subarray(16, 32)
    const enc = buf.subarray(32)
    const key = deriveKey(password, salt)
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)
    const dec = Buffer.concat([decipher.update(enc), decipher.final()])
    return dec.toString("utf8")
}

export default {
    route: {
        method: "get",
        path: "/utils/aes",
        auth: false,
        tags: ["Utils"],
        summary: "AES-256-CBC encrypt/decrypt",
        description: "Enkripsi teks dengan AES-256-CBC (PBKDF2 100k iter, random salt+IV) atau dekripsi kembali.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input (plaintext atau base64 ciphertext)", schema: { type: "string", example: "halo dunia" } },
            { name: "password", in: "query", required: true, description: "Password/kunci", schema: { type: "string", example: "s3cr3t" } },
            { name: "mode", in: "query", required: false, description: "encrypt atau decrypt (default encrypt)", schema: { type: "string", enum: ["encrypt", "decrypt"], default: "encrypt" } },
        ],
        responses: { "200": { description: "Hasil encrypt/decrypt" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const { text, password } = req.query
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        if (!password) return res.status(400).json({ ok: false, error: "password wajib diisi" })
        const mode = String(req.query.mode || "encrypt").toLowerCase()
        try {
            const result = mode === "encrypt"
                ? encrypt(String(text), String(password))
                : decrypt(String(text), String(password))
            res.json({ ok: true, mode, input: String(text), result })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

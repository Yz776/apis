// /utils/password — Random password generator
import crypto from "crypto"

const SETS = {
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
    symbols: "!@#$%^&*()-_=+[]{};:,.<>?/",
}

function pick(set) { return set[crypto.randomInt(set.length)] }

export default {
    route: {
        method: "get",
        path: "/utils/password",
        auth: false,
        tags: ["Utils"],
        summary: "Password acak",
        description: "Membuat password acak yang kuat. Bisa atur panjang dan jenis karakter (lower, upper, digits, symbols).",
        parameters: [
            { name: "length", in: "query", required: false, description: "Panjang password (8-128, default 16)", schema: { type: "integer", default: 16, example: 20 } },
            { name: "lower", in: "query", required: false, description: "Sertakan huruf kecil (default true)", schema: { type: "boolean", default: true } },
            { name: "upper", in: "query", required: false, description: "Sertakan huruf besar (default true)", schema: { type: "boolean", default: true } },
            { name: "digits", in: "query", required: false, description: "Sertakan angka (default true)", schema: { type: "boolean", default: true } },
            { name: "symbols", in: "query", required: false, description: "Sertakan simbol (default false)", schema: { type: "boolean", default: false } },
        ],
        responses: { "200": { description: "Password acak" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        let length = parseInt(req.query.length, 10) || 16
        if (length < 8) length = 8
        if (length > 128) length = 128
        const flags = {
            lower: req.query.lower !== "false",
            upper: req.query.upper !== "false",
            digits: req.query.digits !== "false",
            symbols: req.query.symbols === "true",
        }
        let pool = ""
        for (const k of Object.keys(SETS)) if (flags[k]) pool += SETS[k]
        if (!pool) return res.status(400).json({ ok: false, error: "minimal satu jenis karakter harus aktif" })
        let pw = ""
        for (let i = 0; i < length; i++) pw += pick(pool)
        // strength estimate (entropy bits)
        const entropy = Math.round(length * Math.log2(pool.length))
        let strength = "weak"
        if (entropy >= 60) strength = "medium"
        if (entropy >= 80) strength = "strong"
        if (entropy >= 120) strength = "very strong"
        res.json({ ok: true, password: pw, length, entropy_bits: entropy, strength })
    },
}

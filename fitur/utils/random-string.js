// /utils/random-string — random string with custom charset (secure)
import crypto from "crypto"

const PRESETS = {
    alpha: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    alphanumeric: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    numeric: "0123456789",
    hex: "0123456789abcdef",
    hex_upper: "0123456789ABCDEF",
    symbol: "!@#$%^&*()_+-=[]{}|;:,.<>?",
    all: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?",
}

export default {
    route: {
        method: "get",
        path: "/utils/random-string",
        auth: false,
        tags: ["Utils"],
        summary: "Random string with custom charset (secure)",
        description: "Hasilkan string acak dengan panjang & charset kustom (cryptographically secure).",
        parameters: [
            { name: "length", in: "query", required: false, description: "Panjang string (default 16, max 1024)", schema: { type: "integer", default: 16, example: 32 } },
            { name: "charset", in: "query", required: false, description: "Preset charset atau custom (default alphanumeric)", schema: { type: "string", default: "alphanumeric" } },
            { name: "count", in: "query", required: false, description: "Jumlah string (default 1, max 100)", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "Daftar string acak" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        let length = parseInt(req.query.length, 10) || 16
        if (length < 1) length = 1
        if (length > 1024) length = 1024
        const charsetName = String(req.query.charset || "alphanumeric")
        const charset = PRESETS[charsetName] || charsetName
        if (!charset || charset.length < 2) return res.status(400).json({ ok: false, error: "charset tidak valid (min 2 karakter)" })
        let count = parseInt(req.query.count, 10) || 1
        if (count < 1) count = 1
        if (count > 100) count = 100
        const out = []
        for (let i = 0; i < count; i++) {
            const bytes = crypto.randomBytes(length)
            let s = ""
            for (let j = 0; j < length; j++) s += charset[bytes[j] % charset.length]
            out.push(s)
        }
        res.json({ ok: true, count: out.length, length, charset: charsetName, strings: out })
    },
}

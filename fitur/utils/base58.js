// /utils/base58 — Base58 (Bitcoin alphabet) encode/decode
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

function encodeBase58(input) {
    const bytes = Buffer.from(input, "utf8")
    if (bytes.length === 0) return ""
    let digits = []
    for (const byte of bytes) {
        let carry = byte
        for (let i = 0; i < digits.length; i++) {
            carry += digits[i] * 256
            digits[i] = carry % 58
            carry = Math.floor(carry / 58)
        }
        while (carry > 0) {
            digits.push(carry % 58)
            carry = Math.floor(carry / 58)
        }
    }
    // leading zeros
    let leadingZeros = 0
    for (const b of bytes) {
        if (b === 0) leadingZeros++
        else break
    }
    return "1".repeat(leadingZeros) + digits.reverse().map(d => ALPHABET[d]).join("")
}

function decodeBase58(str) {
    const bytes = []
    for (const ch of str) {
        const idx = ALPHABET.indexOf(ch)
        if (idx === -1) throw new Error(`invalid base58 char: ${ch}`)
        let carry = idx
        for (let i = 0; i < bytes.length; i++) {
            carry += bytes[i] * 58
            bytes[i] = carry & 0xff
            carry >>= 8
        }
        while (carry > 0) {
            bytes.push(carry & 0xff)
            carry >>= 8
        }
    }
    // leading 1s
    let leadingZeros = 0
    for (const ch of str) {
        if (ch === "1") leadingZeros++
        else break
    }
    return Buffer.from(new Array(leadingZeros).fill(0).concat(bytes.reverse())).toString("utf8")
}

export default {
    route: {
        method: "get",
        path: "/utils/base58",
        auth: false,
        tags: ["Utils"],
        summary: "Base58 encode/decode (Bitcoin alphabet)",
        description: "Encode teks ke base58 atau decode base58 ke teks (Bitcoin alphabet).",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "hello" } },
            { name: "mode", in: "query", required: false, description: "encode atau decode (default encode)", schema: { type: "string", enum: ["encode", "decode"], default: "encode" } },
        ],
        responses: { "200": { description: "Hasil encode/decode" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const mode = String(req.query.mode || "encode").toLowerCase()
        try {
            let result
            if (mode === "encode") result = encodeBase58(String(text))
            else if (mode === "decode") result = decodeBase58(String(text))
            else return res.status(400).json({ ok: false, error: "mode harus encode atau decode" })
            res.json({ ok: true, mode, input: String(text), result })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

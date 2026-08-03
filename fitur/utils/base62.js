// /utils/base62 — Base62 encode/decode
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

function encodeBase62(input) {
    const bytes = Buffer.from(input, "utf8")
    if (bytes.length === 0) return ""
    let num = BigInt("0x" + bytes.toString("hex") || "0")
    if (num === 0n) return "0"
    let out = ""
    while (num > 0n) {
        out = ALPHABET[Number(num % 62n)] + out
        num = num / 62n
    }
    return out
}

function decodeBase62(str) {
    let num = 0n
    for (const ch of str) {
        const idx = ALPHABET.indexOf(ch)
        if (idx === -1) throw new Error(`invalid base62 char: ${ch}`)
        num = num * 62n + BigInt(idx)
    }
    const hex = num.toString(16)
    const padded = hex.length % 2 ? "0" + hex : hex
    return Buffer.from(padded, "hex").toString("utf8")
}

export default {
    route: {
        method: "get",
        path: "/utils/base62",
        auth: false,
        tags: ["Utils"],
        summary: "Base62 encode/decode",
        description: "Encode teks ke base62 atau decode base62 ke teks.",
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
            if (mode === "encode") result = encodeBase62(String(text))
            else if (mode === "decode") result = decodeBase62(String(text))
            else return res.status(400).json({ ok: false, error: "mode harus encode atau decode" })
            res.json({ ok: true, mode, input: String(text), result })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

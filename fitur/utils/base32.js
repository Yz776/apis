// /utils/base32 — Base32 encode/decode (RFC 4648)
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function encodeBase32(buf) {
    let bits = 0, value = 0, out = ""
    for (const b of buf) {
        value = (value << 8) | b
        bits += 8
        while (bits >= 5) {
            out += ALPHA[(value >>> (bits - 5)) & 31]
            bits -= 5
        }
    }
    if (bits > 0) out += ALPHA[(value << (5 - bits)) & 31]
    while (out.length % 8) out += "="
    return out
}

function decodeBase32(str) {
    str = str.replace(/=+$/, "").toUpperCase()
    let bits = 0, value = 0, out = []
    for (const c of str) {
        const idx = ALPHA.indexOf(c)
        if (idx < 0) throw new Error("karakter base32 tidak valid: " + c)
        value = (value << 5) | idx
        bits += 5
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 0xff)
            bits -= 8
        }
    }
    return Buffer.from(out)
}

export default {
    route: {
        method: "get",
        path: "/utils/base32",
        auth: false,
        tags: ["Utils"],
        summary: "Base32 encode/decode (RFC 4648)",
        description: "Encode teks ke base32 atau decode base32 ke teks.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo dunia" } },
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
            if (mode === "encode") result = encodeBase32(Buffer.from(String(text), "utf8"))
            else if (mode === "decode") result = decodeBase32(String(text)).toString("utf8")
            else return res.status(400).json({ ok: false, error: "mode harus encode atau decode" })
            res.json({ ok: true, mode, input: String(text), result })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

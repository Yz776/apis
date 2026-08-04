// /utils/base85 — Base85 (RFC 1924 IPv6) encode/decode
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~"

function encodeBase85(input) {
    const bytes = Buffer.from(input, "utf8")
    if (bytes.length === 0) return ""
    let out = ""
    let i = 0
    while (i < bytes.length) {
        let chunk = []
        for (let j = 0; j < 4; j++) {
            chunk.push(i + j < bytes.length ? bytes[i + j] : 0)
        }
        let num = (chunk[0] << 24) >>> 0
        num += (chunk[1] << 16) >>> 0
        num += (chunk[2] << 8) >>> 0
        num += chunk[3] >>> 0
        const chars = []
        for (let k = 0; k < 5; k++) {
            chars.push(ALPHABET[num % 85])
            num = Math.floor(num / 85)
        }
        let actualBytes = Math.min(4, bytes.length - i)
        out += chars.reverse().slice(0, actualBytes + 1).join("")
        i += 4
    }
    return out
}

function decodeBase85(str) {
    let out = []
    let i = 0
    while (i < str.length) {
        let chunk = []
        for (let j = 0; j < 5; j++) {
            if (i + j < str.length) chunk.push(ALPHABET.indexOf(str[i + j]))
            else chunk.push(84)
        }
        if (chunk.some(c => c === -1)) throw new Error("invalid base85 char")
        let num = 0
        for (const c of chunk) num = num * 85 + c
        const bytes = []
        for (let k = 0; k < 4; k++) {
            bytes.unshift(num & 0xff)
            num = Math.floor(num / 256)
        }
        out = out.concat(bytes)
        i += 5
    }
    return Buffer.from(out).toString("utf8")
}

export default {
    route: {
        method: "get",
        path: "/utils/base85",
        auth: false,
        tags: ["Utils"],
        summary: "Base85 encode/decode (RFC 1924)",
        description: "Encode teks ke base85 atau decode base85 ke teks (RFC 1924 alphabet).",
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
            if (mode === "encode") result = encodeBase85(String(text))
            else if (mode === "decode") result = decodeBase85(String(text))
            else return res.status(400).json({ ok: false, error: "mode harus encode atau decode" })
            res.json({ ok: true, mode, input: String(text), result })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

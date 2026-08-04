// /utils/ascii85 — Ascii85 (base85) encode/decode
function encode85(buf) {
    let out = ""
    let i = 0
    while (i < buf.length) {
        let n = 0
        for (let j = 0; j < 4; j++) n = n * 256 + (i + j < buf.length ? buf[i + j] : 0)
        const chunk = []
        for (let j = 4; j >= 0; j--) { chunk[j] = n % 85; n = Math.floor(n / 85) }
        let take = i + 4 <= buf.length ? 5 : (buf.length - i) + 1
        for (let j = 0; j < take; j++) out += String.fromCharCode(chunk[j] + 33)
        i += 4
    }
    return out
}

function decode85(str) {
    const bytes = []
    let i = 0
    while (i < str.length) {
        let n = 0
        const chunk = []
        let take = Math.min(5, str.length - i)
        for (let j = 0; j < 5; j++) {
            if (j < take) {
                const c = str.charCodeAt(i + j) - 33
                if (c < 0 || c > 84) throw new Error("karakter ascii85 tidak valid")
                chunk.push(c)
                n = n * 85 + c
            } else { n = n * 85 + 84 }
        }
        bytes.push((n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff)
        i += 5
    }
    const padding = 5 - Math.min(5, str.length % 5 || 5)
    return Buffer.from(bytes.slice(0, bytes.length - padding))
}

export default {
    route: {
        method: "get",
        path: "/utils/ascii85",
        auth: false,
        tags: ["Utils"],
        summary: "Ascii85 (base85) encode/decode",
        description: "Encode teks ke ascii85 atau decode ascii85 ke teks.",
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
            if (mode === "encode") result = encode85(Buffer.from(String(text), "utf8"))
            else if (mode === "decode") result = decode85(String(text)).toString("utf8")
            else return res.status(400).json({ ok: false, error: "mode harus encode atau decode" })
            res.json({ ok: true, mode, input: String(text), result })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

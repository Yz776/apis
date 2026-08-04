// /utils/vigenere — Vigenère cipher
function process(text, key, decode = false) {
    key = key.toLowerCase().replace(/[^a-z]/g, "")
    if (!key.length) throw new Error("key harus mengandung minimal 1 huruf alfabet")
    let result = "", ki = 0
    for (const c of String(text)) {
        const code = c.charCodeAt(0)
        if (code >= 65 && code <= 90) {
            const shift = key.charCodeAt(ki % key.length) - 97
            const newCode = ((code - 65) + (decode ? -shift : shift) + 26) % 26 + 65
            result += String.fromCharCode(newCode)
            ki++
        } else if (code >= 97 && code <= 122) {
            const shift = key.charCodeAt(ki % key.length) - 97
            const newCode = ((code - 97) + (decode ? -shift : shift) + 26) % 26 + 97
            result += String.fromCharCode(newCode)
            ki++
        } else {
            result += c
        }
    }
    return result
}

export default {
    route: {
        method: "get",
        path: "/utils/vigenere",
        auth: false,
        tags: ["Utils"],
        summary: "Vigenère cipher encode/decode",
        description: "Encode teks dengan Vigenère cipher menggunakan kunci, atau decode kembali.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo dunia" } },
            { name: "key", in: "query", required: true, description: "Kunci cipher (alfabet)", schema: { type: "string", example: "rahasia" } },
            { name: "mode", in: "query", required: false, description: "encode atau decode (default encode)", schema: { type: "string", enum: ["encode", "decode"], default: "encode" } },
        ],
        responses: { "200": { description: "Hasil encode/decode" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const { text, key } = req.query
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        if (!key) return res.status(400).json({ ok: false, error: "key wajib diisi" })
        const mode = String(req.query.mode || "encode").toLowerCase()
        try {
            const result = process(String(text), String(key), mode === "decode")
            res.json({ ok: true, mode, input: String(text), key: String(key), result })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

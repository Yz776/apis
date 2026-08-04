// /utils/html-entities — HTML entity encode/decode
const NAMED = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }
const NAMED_REV = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'", "&apos;": "'" }

function encode(s) {
    return String(s).replace(/[&<>"']/g, c => NAMED[c])
}
function decode(s) {
    return String(s).replace(/&(?:amp|lt|gt|quot|#39|apos);|&#x([0-9a-f]+);|&#(\d+);/gi, (m, hex, dec) => {
        if (NAMED_REV[m]) return NAMED_REV[m]
        if (hex) return String.fromCodePoint(parseInt(hex, 16))
        if (dec) return String.fromCodePoint(parseInt(dec, 10))
        return m
    })
}

export default {
    route: {
        method: "get",
        path: "/utils/html-entities",
        auth: false,
        tags: ["Utils"],
        summary: "HTML entity encode/decode",
        description: "Encode karakter HTML khusus (&, <, >, \", ') atau decode entity kembali ke teks.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "<a href='x'>halo & dunia</a>" } },
            { name: "mode", in: "query", required: false, description: "encode atau decode (default encode)", schema: { type: "string", enum: ["encode", "decode"], default: "encode" } },
        ],
        responses: { "200": { description: "Hasil encode/decode" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const mode = String(req.query.mode || "encode").toLowerCase()
        let result
        if (mode === "encode") result = encode(String(text))
        else if (mode === "decode") result = decode(String(text))
        else return res.status(400).json({ ok: false, error: "mode harus encode atau decode" })
        res.json({ ok: true, mode, input: String(text), result })
    },
}

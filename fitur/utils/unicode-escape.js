// /utils/unicode-escape — \uXXXX escape/unescape
export default {
    route: {
        method: "get",
        path: "/utils/unicode-escape",
        auth: false,
        tags: ["Utils"],
        summary: "Unicode escape (\\uXXXX) encode/decode",
        description: "Encode karakter non-ASCII ke \\uXXXX atau decode kembali ke teks.",
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
        let result
        if (mode === "encode") {
            result = [...String(text)].map(c => {
                const cp = c.codePointAt(0)
                return cp > 127 ? "\\u" + cp.toString(16).padStart(4, "0").toUpperCase() : c
            }).join("")
        } else if (mode === "decode") {
            result = String(text).replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        } else return res.status(400).json({ ok: false, error: "mode harus encode atau decode" })
        res.json({ ok: true, mode, input: String(text), result })
    },
}

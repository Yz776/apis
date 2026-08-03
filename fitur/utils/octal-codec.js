// /utils/octet-codec — text ↔ octal
export default {
    route: {
        method: "get",
        path: "/utils/octal-codec",
        auth: false,
        tags: ["Utils"],
        summary: "Octal codec (text ↔ octal ASCII codes)",
        description: "Encode teks ke oktal atau decode oktal ke teks.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo" } },
            { name: "mode", in: "query", required: false, description: "encode atau decode (default encode)", schema: { type: "string", enum: ["encode", "decode"], default: "encode" } },
            { name: "sep", in: "query", required: false, description: "Pemisah antar kode oktal (default spasi)", schema: { type: "string", default: " " } },
        ],
        responses: { "200": { description: "Hasil encode/decode" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const mode = String(req.query.mode || "encode").toLowerCase()
        const sep = req.query.sep !== undefined ? req.query.sep : " "
        try {
            let result
            if (mode === "encode") {
                result = Buffer.from(String(text), "utf8").toString().split("").map(c => c.charCodeAt(0).toString(8)).join(sep)
            } else if (mode === "decode") {
                result = String(text).split(sep).map(s => String.fromCharCode(parseInt(s, 8))).join("")
            } else return res.status(400).json({ ok: false, error: "mode harus encode atau decode" })
            res.json({ ok: true, mode, input: String(text), result })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

// /utils/decimal-codec — text ↔ decimal ASCII codes
export default {
    route: {
        method: "get",
        path: "/utils/decimal-codec",
        auth: false,
        tags: ["Utils"],
        summary: "Decimal codec (text ↔ decimal ASCII codes)",
        description: "Encode teks ke desimal (kode ASCII) atau decode desimal ke teks.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo" } },
            { name: "mode", in: "query", required: false, description: "encode atau decode (default encode)", schema: { type: "string", enum: ["encode", "decode"], default: "encode" } },
            { name: "sep", in: "query", required: false, description: "Pemisah antar kode (default spasi)", schema: { type: "string", default: " " } },
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
                result = [...String(text)].map(c => c.codePointAt(0)).join(sep)
            } else if (mode === "decode") {
                result = String(text).split(sep).map(s => String.fromCodePoint(parseInt(s, 10))).join("")
            } else return res.status(400).json({ ok: false, error: "mode harus encode atau decode" })
            res.json({ ok: true, mode, input: String(text), result })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

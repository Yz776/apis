// /utils/base64 — base64 encode/decode
export default {
    route: {
        method: "get",
        path: "/utils/base64",
        auth: false,
        tags: ["Utils"],
        summary: "Base64 encode/decode",
        description: "Encode teks ke base64 atau decode base64 ke teks.",
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
            if (mode === "encode") result = Buffer.from(String(text), "utf8").toString("base64")
            else if (mode === "decode") result = Buffer.from(String(text), "base64").toString("utf8")
            else return res.status(400).json({ ok: false, error: "mode harus encode atau decode" })
            res.json({ ok: true, mode, input: String(text), result })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

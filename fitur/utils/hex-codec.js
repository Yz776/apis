// /utils/hex-codec — Hex encode/decode
export default {
    route: {
        method: "get",
        path: "/utils/hex-codec",
        auth: false,
        tags: ["Utils"],
        summary: "Hex encode/decode",
        description: "Encode teks ke heksadesimal atau decode heksadesimal ke teks.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo" } },
            { name: "mode", in: "query", required: false, description: "encode atau decode (default encode)", schema: { type: "string", enum: ["encode", "decode"], default: "encode" } },
        ],
        responses: { "200": { description: "Hasil" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const mode = String(req.query.mode || "encode").toLowerCase()
        try {
            let result
            if (mode === "encode") result = Buffer.from(String(text), "utf8").toString("hex")
            else if (mode === "decode") result = Buffer.from(String(text), "hex").toString("utf8")
            else return res.status(400).json({ ok: false, error: "mode harus encode atau decode" })
            res.json({ ok: true, mode, input: String(text), result })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

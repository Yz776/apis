// /utils/url-codec — URL encode/decode
export default {
    route: {
        method: "get",
        path: "/utils/url-codec",
        auth: false,
        tags: ["Utils"],
        summary: "URL encode/decode",
        description: "Encode teks ke URL-safe format atau decode URL-encoded teks.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo dunia & selamat" } },
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
            if (mode === "encode") result = encodeURIComponent(String(text))
            else if (mode === "decode") result = decodeURIComponent(String(text))
            else return res.status(400).json({ ok: false, error: "mode harus encode atau decode" })
            res.json({ ok: true, mode, input: String(text), result })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

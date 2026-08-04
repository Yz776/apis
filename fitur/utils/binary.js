// /utils/binary — Binary encode/decode (text <-> 8-bit binary string)
export default {
    route: {
        method: "get",
        path: "/utils/binary",
        auth: false,
        tags: ["Utils"],
        summary: "Binary encode/decode",
        description: "Encode teks ke string biner (8-bit per karakter) atau decode string biner ke teks.",
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
            if (mode === "encode") {
                result = Array.from(String(text)).map(c => c.charCodeAt(0).toString(2).padStart(8, "0")).join(" ")
            } else if (mode === "decode") {
                const parts = String(text).trim().split(/\s+/)
                result = parts.map(p => String.fromCharCode(parseInt(p, 2))).join("")
            } else return res.status(400).json({ ok: false, error: "mode harus encode atau decode" })
            res.json({ ok: true, mode, input: String(text), result })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

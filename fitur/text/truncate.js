// /text/truncate — truncate text with ellipsis
export default {
    route: {
        method: "get",
        path: "/text/truncate",
        auth: false,
        tags: ["Text"],
        summary: "Truncate text with ellipsis",
        description: "Potong teks ke panjang tertentu, tambahkan ellipsis (...) di akhir jika terpotong.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "Lorem ipsum dolor sit amet consectetur adipiscing elit" } },
            { name: "length", in: "query", required: false, description: "Panjang maksimum (default 50)", schema: { type: "integer", default: 50, example: 20 } },
            { name: "ellipsis", in: "query", required: false, description: "Tanda ellipsis (default ...)", schema: { type: "string", default: "..." } },
            { name: "word_boundary", in: "query", required: false, description: "Potong di batas kata (default true)", schema: { type: "boolean", default: true } },
        ],
        responses: { "200": { description: "Teks terpotong" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        let len = parseInt(req.query.length, 10) || 50
        if (len < 0) len = 0
        const ellipsis = req.query.ellipsis !== undefined ? req.query.ellipsis : "..."
        const wb = String(req.query.word_boundary).toLowerCase() !== "false"
        const s = String(text)
        if (s.length <= len) return res.json({ ok: true, input: s, result: s, truncated: false })
        const maxContent = Math.max(0, len - ellipsis.length)
        let cut = s.slice(0, maxContent)
        if (wb) {
            const lastSpace = cut.lastIndexOf(" ")
            if (lastSpace > 0) cut = cut.slice(0, lastSpace)
        }
        res.json({ ok: true, input: s, result: cut + ellipsis, truncated: true, original_length: s.length, result_length: cut.length + ellipsis.length })
    },
}

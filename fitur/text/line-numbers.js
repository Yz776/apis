// /text/line-numbers — add line numbers to text
export default {
    route: {
        method: "get",
        path: "/text/line-numbers",
        auth: false,
        tags: ["Text"],
        summary: "Add line numbers to text",
        description: "Tambahkan nomor baris di awal setiap baris teks.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "baris 1\nbaris 2\nbaris 3" } },
            { name: "start", in: "query", required: false, description: "Nomor awal (default 1)", schema: { type: "integer", default: 1 } },
            { name: "separator", in: "query", required: false, description: "Pemisah setelah nomor (default ': ')", schema: { type: "string", default: ": " } },
            { name: "pad", in: "query", required: false, description: "Padding angka (default 0 = auto)", schema: { type: "integer", default: 0 } },
        ],
        responses: { "200": { description: "Teks dengan nomor baris" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        let start = parseInt(req.query.start, 10) || 1
        const sep = req.query.separator !== undefined ? req.query.separator : ": "
        const lines = String(text).split("\n")
        let pad = parseInt(req.query.pad, 10) || 0
        if (pad === 0) pad = String(start + lines.length - 1).length
        const result = lines.map((line, i) => String(start + i).padStart(pad, "0") + sep + line).join("\n")
        res.json({ ok: true, input: String(text), line_count: lines.length, result })
    },
}

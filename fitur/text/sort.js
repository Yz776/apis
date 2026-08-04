// /text/sort — Sort lines / words
export default {
    route: {
        method: "get",
        path: "/text/sort",
        auth: false,
        tags: ["Text"],
        summary: "Sort text (lines or words)",
        description: "Mengurutkan baris atau kata. Bisa asc/desc, case-sensitive atau insensitive, hapus duplikat.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "banana\napple\ncherry" } },
            { name: "by", in: "query", required: false, description: "lines atau words (default lines)", schema: { type: "string", enum: ["lines", "words"], default: "lines" } },
            { name: "order", in: "query", required: false, description: "asc atau desc (default asc)", schema: { type: "string", enum: ["asc", "desc"], default: "asc" } },
            { name: "unique", in: "query", required: false, description: "Hapus duplikat (default false)", schema: { type: "boolean", default: false } },
        ],
        responses: { "200": { description: "Hasil sort" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const by = String(req.query.by || "lines").toLowerCase()
        const order = String(req.query.order || "asc").toLowerCase()
        const unique = req.query.unique === "true"
        let arr = by === "lines" ? String(text).split(/\n/) : String(text).split(/\s+/)
        arr = arr.filter(x => x !== "")
        if (unique) arr = [...new Set(arr)]
        arr.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
        if (order === "desc") arr.reverse()
        const result = arr.join(by === "lines" ? "\n" : " ")
        res.json({ ok: true, by, order, unique, count: arr.length, result })
    },
}

// /text/unique — Remove duplicate lines/words
export default {
    route: {
        method: "get",
        path: "/text/unique",
        auth: false,
        tags: ["Text"],
        summary: "Remove duplicates",
        description: "Hapus baris atau kata yang duplikat. Banyak opsi: case-sensitive, sort hasil.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "apple\nbanana\napple\ncherry" } },
            { name: "by", in: "query", required: false, description: "lines atau words (default lines)", schema: { type: "string", enum: ["lines", "words"], default: "lines" } },
            { name: "ci", in: "query", required: false, description: "Case-insensitive (default false)", schema: { type: "boolean", default: false } },
            { name: "sort", in: "query", required: false, description: "Sort hasil (default false)", schema: { type: "boolean", default: false } },
        ],
        responses: { "200": { description: "Hasil" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const by = String(req.query.by || "lines").toLowerCase()
        const ci = req.query.ci === "true"
        const doSort = req.query.sort === "true"
        let arr = by === "lines" ? String(text).split(/\n/) : String(text).split(/\s+/)
        arr = arr.filter(x => x !== "")
        const seen = new Set()
        const out = []
        for (const x of arr) {
            const key = ci ? x.toLowerCase() : x
            if (!seen.has(key)) { seen.add(key); out.push(x) }
        }
        if (doSort) out.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        const result = out.join(by === "lines" ? "\n" : " ")
        res.json({ ok: true, by, original_count: arr.length, unique_count: out.length, duplicates_removed: arr.length - out.length, result })
    },
}

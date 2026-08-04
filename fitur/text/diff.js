// /text/diff — Simple line diff between two texts
function diffLines(a, b) {
    const aLines = a.split(/\n/)
    const bLines = b.split(/\n/)
    const max = Math.max(aLines.length, bLines.length)
    const out = []
    for (let i = 0; i < max; i++) {
        const al = aLines[i] ?? null
        const bl = bLines[i] ?? null
        if (al === bl) continue
        if (al !== null && bl === null) out.push({ line: i + 1, type: "removed", text: al })
        else if (al === null && bl !== null) out.push({ line: i + 1, type: "added", text: bl })
        else { out.push({ line: i + 1, type: "removed", text: al }); out.push({ line: i + 1, type: "added", text: bl }) }
    }
    return out
}

export default {
    route: {
        method: "get",
        path: "/text/diff",
        auth: false,
        tags: ["Text"],
        summary: "Line diff (perbandingan teks)",
        description: "Membandingkan dua teks per baris dan menampilkan perbedaan (added/removed).",
        parameters: [
            { name: "a", in: "query", required: true, description: "Teks pertama", schema: { type: "string", example: "baris 1\nbaris 2\nbaris 3" } },
            { name: "b", in: "query", required: true, description: "Teks kedua", schema: { type: "string", example: "baris 1\nbaris baru\nbaris 3" } },
        ],
        responses: { "200": { description: "Hasil diff" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        if (!req.query.a || !req.query.b) return res.status(400).json({ ok: false, error: "a dan b wajib diisi" })
        const changes = diffLines(String(req.query.a), String(req.query.b))
        res.json({ ok: true, total_changes: changes.length, changes })
    },
}

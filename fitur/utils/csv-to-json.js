// /utils/csv-to-json — CSV to JSON converter
function parseCSV(text, delimiter = ",", hasHeader = true) {
    const rows = []
    let row = [], field = "", inQuotes = false
    for (let i = 0; i < text.length; i++) {
        const c = text[i], next = text[i + 1]
        if (inQuotes) {
            if (c === '"' && next === '"') { field += '"'; i++ }
            else if (c === '"') inQuotes = false
            else field += c
        } else {
            if (c === '"') inQuotes = true
            else if (c === delimiter) { row.push(field); field = "" }
            else if (c === "\n") { row.push(field); rows.push(row); row = []; field = "" }
            else if (c === "\r") { /* ignore */ }
            else field += c
        }
    }
    if (field !== "" || row.length > 0) { row.push(field); rows.push(row) }
    return rows
}

export default {
    route: {
        method: "get",
        path: "/utils/csv-to-json",
        auth: false,
        tags: ["Utils"],
        summary: "CSV to JSON converter",
        description: "Konversi CSV ke array of objects (dengan header) atau array of arrays (tanpa header).",
        parameters: [
            { name: "csv", in: "query", required: true, description: "String CSV", schema: { type: "string", example: "name,age\nAlice,30\nBob,25" } },
            { name: "delimiter", in: "query", required: false, description: "Delimiter (default koma)", schema: { type: "string", default: "," } },
            { name: "header", in: "query", required: false, description: "Apakah baris pertama adalah header (default true)", schema: { type: "boolean", default: true } },
        ],
        responses: { "200": { description: "JSON hasil konversi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const csv = req.query.csv
        if (!csv) return res.status(400).json({ ok: false, error: "csv wajib diisi" })
        const delim = req.query.delimiter || ","
        const hasHeader = String(req.query.header).toLowerCase() !== "false"
        try {
            const rows = parseCSV(String(csv), delim, hasHeader)
            if (!rows.length) return res.json({ ok: true, rows: [], count: 0 })
            if (!hasHeader) return res.json({ ok: true, rows, count: rows.length })
            const header = rows[0]
            const objects = rows.slice(1).map(r => {
                const obj = {}
                header.forEach((h, i) => obj[h] = r[i] !== undefined ? r[i] : "")
                return obj
            })
            res.json({ ok: true, headers: header, rows: objects, count: objects.length })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

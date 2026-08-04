// /utils/json-to-csv — JSON to CSV converter
function escapeCSV(value, delim) {
    const s = String(value ?? "")
    if (s.includes(delim) || s.includes('"') || s.includes("\n")) return '"' + s.replace(/"/g, '""') + '"'
    return s
}

export default {
    route: {
        method: "get",
        path: "/utils/json-to-csv",
        auth: false,
        tags: ["Utils"],
        summary: "JSON to CSV converter",
        description: "Konversi array of objects (JSON) ke CSV.",
        parameters: [
            { name: "json", in: "query", required: true, description: "JSON array of objects", schema: { type: "string", example: '[{"name":"Alice","age":30},{"name":"Bob","age":25}]' } },
            { name: "delimiter", in: "query", required: false, description: "Delimiter (default koma)", schema: { type: "string", default: "," } },
        ],
        responses: { "200": { description: "CSV hasil konversi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const json = req.query.json
        if (!json) return res.status(400).json({ ok: false, error: "json wajib diisi" })
        const delim = req.query.delimiter || ","
        try {
            const data = JSON.parse(String(json))
            if (!Array.isArray(data)) return res.status(400).json({ ok: false, error: "json harus array of objects" })
            if (!data.length) return res.json({ ok: true, csv: "", count: 0 })
            const headers = [...new Set(data.flatMap(o => Object.keys(o)))]
            const lines = [headers.join(delim)]
            for (const obj of data) {
                lines.push(headers.map(h => escapeCSV(obj[h], delim)).join(delim))
            }
            const csv = lines.join("\n")
            res.json({ ok: true, headers, csv, count: data.length })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

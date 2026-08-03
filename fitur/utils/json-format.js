// /utils/json-format — pretty/minify JSON
export default {
    route: {
        method: "get",
        path: "/utils/json-format",
        auth: false,
        tags: ["Utils"],
        summary: "JSON pretty/minify",
        description: "Format (pretty-print) atau minify JSON string.",
        parameters: [
            { name: "json", in: "query", required: true, description: "String JSON", schema: { type: "string", example: '{"name":"halo","age":25,"items":[1,2,3]}' } },
            { name: "mode", in: "query", required: false, description: "pretty atau minify (default pretty)", schema: { type: "string", enum: ["pretty", "minify"], default: "pretty" } },
            { name: "indent", in: "query", required: false, description: "Jumlah spasi indent (default 2, untuk pretty)", schema: { type: "integer", default: 2 } },
        ],
        responses: { "200": { description: "JSON terformat" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const json = req.query.json
        if (!json) return res.status(400).json({ ok: false, error: "json wajib diisi" })
        const mode = String(req.query.mode || "pretty").toLowerCase()
        let indent = parseInt(req.query.indent, 10) || 2
        if (indent < 1) indent = 1
        if (indent > 8) indent = 8
        try {
            const parsed = JSON.parse(String(json))
            const result = mode === "minify" ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent)
            res.json({ ok: true, mode, input: String(json), result, size: result.length })
        } catch (e) { res.status(400).json({ ok: false, error: "JSON tidak valid: " + e.message }) }
    },
}

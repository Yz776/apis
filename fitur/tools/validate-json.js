// /tools/validate-json — Validasi & Format JSON
// Built-in: no external API, pure JSON.parse + formatting
export default {
    route: {
        method: "get",
        path: "/tools/validate-json",
        auth: false,
        tags: ["Tools", "Dev", "Utils"],
        summary: "Validasi & Format JSON",
        description: "Validasi syntax JSON & pretty-print. Input via query param ?json=... atau POST body (GET-only API).",
        parameters: [
            { name: "json", in: "query", required: true, description: "String JSON yang divalidasi", schema: { type: "string", example: '{"name":"John","age":30}' } },
            { name: "indent", in: "query", required: false, description: "Spasi indentasi (default 2)", schema: { type: "integer", default: 2 } },
        ],
        responses: { "200": { description: "Hasil validasi" }, "400": { description: "JSON tidak valid" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const { json, indent = 2 } = req.query
        if (!json) return res.status(400).json({ ok: false, error: "json wajib diisi" })
        try {
            const parsed = JSON.parse(json)
            const formatted = JSON.stringify(parsed, null, parseInt(indent, 10) || 2)
            res.json({ ok: true, valid: true, formatted, parsed })
        } catch (e) {
            res.status(400).json({ ok: false, valid: false, error: e.message, position: e.message.match(/position (\d+)/)?.[1] || null })
        }
    },
}
// /utils/json-validate — validate JSON string
export default {
    route: {
        method: "get",
        path: "/utils/json-validate",
        auth: false,
        tags: ["Utils"],
        summary: "Validate JSON string",
        description: "Validasi apakah string adalah JSON yang valid. Mengembalikan error jika tidak.",
        parameters: [
            { name: "json", in: "query", required: true, description: "String JSON", schema: { type: "string", example: '{"name":"halo"}' } },
        ],
        responses: { "200": { description: "Hasil validasi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const json = req.query.json
        if (!json) return res.status(400).json({ ok: false, error: "json wajib diisi" })
        try {
            const parsed = JSON.parse(String(json))
            const type = Array.isArray(parsed) ? "array" : typeof parsed
            res.json({
                ok: true,
                valid: true,
                type,
                ...(type === "array" ? { length: parsed.length } : {}),
                ...(type === "object" ? { keys: Object.keys(parsed), key_count: Object.keys(parsed).length } : {}),
            })
        } catch (e) {
            res.json({ ok: true, valid: false, error: e.message })
        }
    },
}

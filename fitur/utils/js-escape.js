// /utils/js-escape — JavaScript string escape/unescape
export default {
    route: {
        method: "get",
        path: "/utils/js-escape",
        auth: false,
        tags: ["Utils"],
        summary: "JavaScript string escape/unescape",
        description: "Escape string untuk dipakai di literal JavaScript, atau unescape kembali.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "Halo \"dunia\"\\nBaris 2" } },
            { name: "mode", in: "query", required: false, description: "escape atau unescape (default escape)", schema: { type: "string", enum: ["escape", "unescape"], default: "escape" } },
        ],
        responses: { "200": { description: "Hasil escape/unescape" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const mode = String(req.query.mode || "escape").toLowerCase()
        let result
        if (mode === "escape") {
            result = JSON.stringify(String(text)).slice(1, -1)
        } else if (mode === "unescape") {
            try { result = JSON.parse("\"" + String(text) + "\"") }
            catch (e) { return res.status(400).json({ ok: false, error: "string escape tidak valid: " + e.message }) }
        } else return res.status(400).json({ ok: false, error: "mode harus escape atau unescape" })
        res.json({ ok: true, mode, input: String(text), result })
    },
}

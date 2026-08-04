// /text/reverse — Reverse text (characters / words / lines)
export default {
    route: {
        method: "get",
        path: "/text/reverse",
        auth: false,
        tags: ["Text"],
        summary: "Reverse text",
        description: "Membalik teks per karakter, per kata, atau per baris.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo dunia" } },
            { name: "mode", in: "query", required: false, description: "chars, words, atau lines (default chars)", schema: { type: "string", enum: ["chars", "words", "lines"], default: "chars" } },
        ],
        responses: { "200": { description: "Hasil reverse" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const mode = String(req.query.mode || "chars").toLowerCase()
        let result
        if (mode === "chars") result = Array.from(String(text)).reverse().join("")
        else if (mode === "words") result = String(text).split(/\s+/).reverse().join(" ")
        else if (mode === "lines") result = String(text).split(/\n/).reverse().join("\n")
        else return res.status(400).json({ ok: false, error: "mode harus chars, words, atau lines" })
        res.json({ ok: true, mode, input: String(text), result })
    },
}

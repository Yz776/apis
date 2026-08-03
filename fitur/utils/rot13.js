// /utils/rot13 — ROT13 cipher
export default {
    route: {
        method: "get",
        path: "/utils/rot13",
        auth: false,
        tags: ["Utils"],
        summary: "ROT13 cipher",
        description: "Encode/decode teks dengan ROT13 (geser 13 huruf). Self-inverse: apply dua kali = teks asli.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo dunia" } },
        ],
        responses: { "200": { description: "Hasil ROT13" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const result = String(text).replace(/[a-zA-Z]/g, c => {
            const code = c.charCodeAt(0)
            const base = code >= 97 ? 97 : 65
            return String.fromCharCode((code - base + 13) % 26 + base)
        })
        res.json({ ok: true, input: String(text), result })
    },
}

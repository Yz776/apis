// /utils/caesar — Caesar cipher with custom shift
export default {
    route: {
        method: "get",
        path: "/utils/caesar",
        auth: false,
        tags: ["Utils"],
        summary: "Caesar cipher",
        description: "Encode teks dengan Caesar cipher (geser N huruf). Shift positif untuk encode, negatif untuk decode.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo" } },
            { name: "shift", in: "query", required: false, description: "Pergeseran huruf (default 3)", schema: { type: "integer", default: 3, example: 5 } },
        ],
        responses: { "200": { description: "Hasil Caesar cipher" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        let shift = parseInt(req.query.shift, 10)
        if (isNaN(shift)) shift = 3
        shift = ((shift % 26) + 26) % 26
        const result = String(text).replace(/[a-zA-Z]/g, c => {
            const code = c.charCodeAt(0)
            const base = code >= 97 ? 97 : 65
            return String.fromCharCode((code - base + shift) % 26 + base)
        })
        res.json({ ok: true, shift, input: String(text), result })
    },
}

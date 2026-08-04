// /utils/atbash — Atbash cipher (Hebrew reversal cipher, A↔Z, B↔Y, ...)
export default {
    route: {
        method: "get",
        path: "/utils/atbash",
        auth: false,
        tags: ["Utils"],
        summary: "Atbash cipher encode/decode",
        description: "Atbash cipher: balik alfabet (A↔Z, B↔Y, C↔X, ...). Encode & decode identik.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo dunia" } },
        ],
        responses: { "200": { description: "Hasil Atbash" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const result = String(text).replace(/[a-z]/g, c => String.fromCharCode(219 - c.charCodeAt(0)))
                                    .replace(/[A-Z]/g, c => String.fromCharCode(155 - c.charCodeAt(0)))
        res.json({ ok: true, input: String(text), result })
    },
}

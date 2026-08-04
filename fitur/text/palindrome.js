// /text/palindrome — palindrome checker
export default {
    route: {
        method: "get",
        path: "/text/palindrome",
        auth: false,
        tags: ["Text"],
        summary: "Palindrome checker",
        description: "Cek apakah teks adalah palindrom (membaca sama dari depan & belakang).",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "Kasur ini rusak" } },
            { name: "ignore_case", in: "query", required: false, description: "Abai-case (default true)", schema: { type: "boolean", default: true } },
            { name: "ignore_non_alnum", in: "query", required: false, description: "Abai-spasi & tanda baca (default true)", schema: { type: "boolean", default: true } },
        ],
        responses: { "200": { description: "Hasil cek palindrom" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const ignoreCase = String(req.query.ignore_case).toLowerCase() !== "false"
        const ignoreNonAlnum = String(req.query.ignore_non_alnum).toLowerCase() !== "false"
        let s = String(text)
        if (ignoreNonAlnum) s = s.replace(/[^a-zA-Z0-9]/g, "")
        if (ignoreCase) s = s.toLowerCase()
        const reversed = [...s].reverse().join("")
        res.json({ ok: true, input: String(text), normalized: s, reversed, is_palindrome: s === reversed, length: s.length })
    },
}

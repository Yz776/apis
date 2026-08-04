// /text/find-replace — find & replace (string or regex)
export default {
    route: {
        method: "get",
        path: "/text/find-replace",
        auth: false,
        tags: ["Text"],
        summary: "Find & replace (string or regex)",
        description: "Cari & ganti teks menggunakan string literal atau regex JavaScript.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo dunia halo semua" } },
            { name: "find", in: "query", required: true, description: "Pattern yang dicari (string atau /regex/flags)", schema: { type: "string", example: "halo" } },
            { name: "replace", in: "query", required: true, description: "Teks pengganti", schema: { type: "string", example: "hi" } },
            { name: "regex", in: "query", required: false, description: "Apakah find adalah regex (default false)", schema: { type: "boolean", default: false } },
            { name: "flags", in: "query", required: false, description: "Regex flags (default g)", schema: { type: "string", default: "g" } },
        ],
        responses: { "200": { description: "Hasil replace" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const { text, find, replace } = req.query
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        if (find === undefined) return res.status(400).json({ ok: false, error: "find wajib diisi" })
        if (replace === undefined) return res.status(400).json({ ok: false, error: "replace wajib diisi" })
        let result, matches = 0
        try {
            if (String(req.query.regex).toLowerCase() === "true") {
                const flags = String(req.query.flags || "g")
                const re = new RegExp(String(find), flags)
                const before = String(text)
                result = before.replace(re, () => { matches++; return String(replace) })
            } else {
                const parts = String(text).split(String(find))
                matches = parts.length - 1
                result = parts.join(String(replace))
            }
            res.json({ ok: true, input: String(text), find: String(find), replace: String(replace), matches, result })
        } catch (e) { res.status(400).json({ ok: false, error: "regex tidak valid: " + e.message }) }
    },
}

// /text/regex — Regex tester
export default {
    route: {
        method: "get",
        path: "/text/regex",
        auth: false,
        tags: ["Text"],
        summary: "Regex tester",
        description: "Tes regex terhadap teks. Mengembalikan matches, groups, dan posisi.",
        parameters: [
            { name: "pattern", in: "query", required: true, description: "Pattern regex tanpa delimiter", schema: { type: "string", example: "\\d+" } },
            { name: "text", in: "query", required: true, description: "Teks yang diuji", schema: { type: "string", example: "abc 123 def 456" } },
            { name: "flags", in: "query", required: false, description: "Flag regex (default g)", schema: { type: "string", default: "g", example: "gi" } },
        ],
        responses: { "200": { description: "Hasil regex" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const pattern = String(req.query.pattern || "")
        const text = String(req.query.text || "")
        const flags = String(req.query.flags || "g")
        if (!pattern) return res.status(400).json({ ok: false, error: "pattern wajib diisi" })
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        let re
        try { re = new RegExp(pattern, flags) }
        catch (e) { return res.status(400).json({ ok: false, error: "Regex tidak valid: " + e.message }) }
        const matches = []
        if (flags.includes("g")) {
            let m
            while ((m = re.exec(text)) !== null) {
                matches.push({ match: m[0], index: m.index, groups: m.slice(1) })
                if (m.index === re.lastIndex) re.lastIndex++
                if (matches.length > 1000) break
            }
        } else {
            const m = re.exec(text)
            if (m) matches.push({ match: m[0], index: m.index, groups: m.slice(1) })
        }
        res.json({ ok: true, pattern: "/" + pattern + "/" + flags, text_length: text.length, total_matches: matches.length, matches })
    },
}

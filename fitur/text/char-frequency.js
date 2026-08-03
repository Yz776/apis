// /text/char-frequency — character frequency analysis
export default {
    route: {
        method: "get",
        path: "/text/char-frequency",
        auth: false,
        tags: ["Text"],
        summary: "Character frequency analysis",
        description: "Hitung frekuensi karakter dalam teks (termasuk spasi & simbol).",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo dunia" } },
            { name: "ignore_case", in: "query", required: false, description: "Abai-case (default true)", schema: { type: "boolean", default: true } },
            { name: "ignore_whitespace", in: "query", required: false, description: "Abai whitespace (default false)", schema: { type: "boolean", default: false } },
        ],
        responses: { "200": { description: "Frekuensi karakter" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        let text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const ignoreCase = String(req.query.ignore_case).toLowerCase() !== "false"
        const ignoreWs = String(req.query.ignore_whitespace).toLowerCase() === "true"
        let s = String(text)
        if (ignoreCase) s = s.toLowerCase()
        if (ignoreWs) s = s.replace(/\s/g, "")
        const freq = {}
        for (const c of s) freq[c] = (freq[c] || 0) + 1
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
        res.json({
            ok: true,
            total_chars: s.length,
            unique_chars: Object.keys(freq).length,
            top: sorted.map(([char, count]) => ({ char, count, percent: Number(((count / s.length) * 100).toFixed(2)) }))
        })
    },
}

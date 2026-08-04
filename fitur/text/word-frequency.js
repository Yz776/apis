// /text/word-frequency — word frequency analysis
export default {
    route: {
        method: "get",
        path: "/text/word-frequency",
        auth: false,
        tags: ["Text"],
        summary: "Word frequency analysis",
        description: "Hitung frekuensi setiap kata dalam teks. Case-insensitive, strip punctuation.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "the quick brown fox jumps over the lazy dog the the" } },
            { name: "limit", in: "query", required: false, description: "Jumlah kata teratas (default 20)", schema: { type: "integer", default: 20 } },
            { name: "order", in: "query", required: false, description: "Urutan: freq atau alpha (default freq)", schema: { type: "string", enum: ["freq", "alpha"], default: "freq" } },
        ],
        responses: { "200": { description: "Frekuensi kata" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const words = String(text).toLowerCase().match(/\b[\w']+\b/g) || []
        const freq = {}
        for (const w of words) freq[w] = (freq[w] || 0) + 1
        let entries = Object.entries(freq)
        if (String(req.query.order || "freq") === "alpha") entries.sort((a, b) => a[0].localeCompare(b[0]))
        else entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        const limit = parseInt(req.query.limit, 10) || 20
        entries = entries.slice(0, limit)
        res.json({ ok: true, total_words: words.length, unique_words: Object.keys(freq).length, top: entries.map(([word, count]) => ({ word, count })) })
    },
}

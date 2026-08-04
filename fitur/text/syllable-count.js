// /text/syllable-count — Syllable counter (English heuristic)
function countSyllablesWord(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, "")
    if (!word) return 0
    if (word.length <= 3) return 1
    // remove silent e
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    word = word.replace(/^y/, "")
    const matches = word.match(/[aeiouy]{1,2}/g)
    return matches ? matches.length : 1
}

export default {
    route: {
        method: "get",
        path: "/text/syllable-count",
        auth: false,
        tags: ["Text"],
        summary: "Syllable counter (English heuristic)",
        description: "Menghitung jumlah suku kata teks English (heuristic, tidak 100% akurat untuk semua kata).",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "Hello beautiful world" } },
        ],
        responses: { "200": { description: "Jumlah suku kata" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = String(req.query.text || "")
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        try {
            const words = text.trim().split(/\s+/).filter(Boolean)
            const perWord = words.map(w => ({ word: w, syllables: countSyllablesWord(w) }))
            const total = perWord.reduce((s, w) => s + w.syllables, 0)
            res.json({
                ok: true,
                text,
                total_syllables: total,
                word_count: words.length,
                per_word: perWord,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

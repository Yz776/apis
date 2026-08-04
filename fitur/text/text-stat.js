// /text/text-stat — Text statistics (Flesch-Kincaid, Gunning Fog)
export default {
    route: {
        method: "get",
        path: "/text/text-stat",
        auth: false,
        tags: ["Text"],
        summary: "Text statistics (readability)",
        description: "Statistik teks: Flesch Reading Ease, Flesch-Kincaid Grade, Gunning Fog Index, automated readability.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "This is a sample sentence. It contains several words for analysis." } },
        ],
        responses: { "200": { description: "Statistik teks" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = String(req.query.text || "")
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        try {
            const words = text.trim().split(/\s+/).filter(Boolean)
            const wordCount = words.length
            if (wordCount === 0) return res.status(400).json({ ok: false, error: "teks kosong" })
            const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length
            const chars = text.length
            const charsNoSpace = text.replace(/\s/g, "").length
            const letters = (text.match(/[a-zA-Z]/g) || []).length
            // syllable count per word (heuristic)
            const syllableCount = (word) => {
                word = word.toLowerCase().replace(/[^a-z]/g, "")
                if (!word) return 0
                if (word.length <= 3) return 1
                word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
                word = word.replace(/^y/, "")
                const m = word.match(/[aeiouy]{1,2}/g)
                return m ? m.length : 1
            }
            const totalSyllables = words.reduce((s, w) => s + syllableCount(w), 0)
            const complexWords = words.filter(w => syllableCount(w) >= 3).length

            const fleschReadingEase = 206.835 - 1.015 * (wordCount / sentences) - 84.6 * (totalSyllables / wordCount)
            const fleschKincaidGrade = 0.39 * (wordCount / sentences) + 11.8 * (totalSyllables / wordCount) - 15.59
            const gunningFog = 0.4 * (wordCount / sentences + 100 * (complexWords / wordCount))
            const automatedReadability = 4.71 * (charsNoSpace / wordCount) + 0.5 * (wordCount / sentences) - 21.43
            const colemanLiau = 0.0588 * (letters / wordCount * 100) - 0.296 * (sentences / wordCount * 100) - 15.8

            const interpret = (score) => {
                if (score >= 90) return "Very Easy (5th grade)"
                if (score >= 80) return "Easy (6th grade)"
                if (score >= 70) return "Fairly Easy (7th grade)"
                if (score >= 60) return "Standard (8-9th grade)"
                if (score >= 50) return "Fairly Difficult (10-12th grade)"
                if (score >= 30) return "Difficult (College)"
                return "Very Difficult (College Graduate)"
            }

            res.json({
                ok: true,
                text,
                counts: { words: wordCount, sentences, chars, chars_no_space: charsNoSpace, letters, syllables: totalSyllables, complex_words: complexWords, avg_word_length: (letters / wordCount).toFixed(2), avg_sentence_length: (wordCount / sentences).toFixed(2) },
                flesch_reading_ease: { score: fleschReadingEase.toFixed(2), interpretation: interpret(fleschReadingEase) },
                flesch_kincaid_grade: fleschKincaidGrade.toFixed(2),
                gunning_fog_index: gunningFog.toFixed(2),
                automated_readability_index: automatedReadability.toFixed(2),
                coleman_liau_index: colemanLiau.toFixed(2),
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

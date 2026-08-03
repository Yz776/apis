// /text/reading-time — Reading time estimator
export default {
    route: {
        method: "get",
        path: "/text/reading-time",
        auth: false,
        tags: ["Text"],
        summary: "Reading time estimator",
        description: "Estimasi waktu baca berdasarkan jumlah kata. Default 200 wpm (average adult).",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks yang dihitung", schema: { type: "string", example: "This is a sample text for reading time estimation." } },
            { name: "wpm", in: "query", required: false, description: "Words per minute (default 200)", schema: { type: "integer", default: 200 } },
        ],
        responses: { "200": { description: "Estimasi waktu baca" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = String(req.query.text || "")
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        try {
            const wpm = Math.min(1000, Math.max(50, parseInt(req.query.wpm) || 200))
            const words = text.trim().split(/\s+/).filter(Boolean).length
            const chars = text.length
            const charsNoSpace = text.replace(/\s/g, "").length
            const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length
            const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length
            const minutes = words / wpm
            const seconds = Math.ceil(minutes * 60)
            const formatTime = (s) => {
                const m = Math.floor(s / 60)
                const r = s % 60
                return m > 0 ? `${m}m ${r}s` : `${r}s`
            }
            res.json({
                ok: true,
                text_stats: { words, chars, chars_no_space: charsNoSpace, sentences, paragraphs },
                wpm,
                reading_time_seconds: seconds,
                reading_time_minutes: minutes.toFixed(2),
                reading_time_human: formatTime(seconds),
                reading_time_slow: formatTime(Math.ceil(words / 100 * 60)), // 100 wpm
                reading_time_fast: formatTime(Math.ceil(words / 400 * 60)), // 400 wpm
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

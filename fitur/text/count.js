// /text/count — Word/character counter
export default {
    route: {
        method: "get",
        path: "/text/count",
        auth: false,
        tags: ["Text"],
        summary: "Word & character counter",
        description: "Hitung jumlah karakter, kata, kalimat, paragraf, dan estimasi waktu baca.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "Halo dunia. Selamat datang di API." } },
        ],
        responses: { "200": { description: "Statistik teks" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const s = String(text)
        const chars = s.length
        const chars_no_space = s.replace(/\s/g, "").length
        const words = (s.match(/\S+/g) || []).length
        const sentences = (s.match(/[.!?]+(\s|$)/g) || []).length || (s.trim() ? 1 : 0)
        const paragraphs = (s.split(/\n\s*\n/).filter(p => p.trim()).length) || (s.trim() ? 1 : 0)
        const lines = s.split(/\n/).length
        const read_time_sec = Math.ceil((words / 200) * 60)
        res.json({ ok: true, chars, chars_no_space, words, sentences, paragraphs, lines, read_time_seconds: read_time_sec, read_time: `${Math.floor(read_time_sec / 60)}m ${read_time_sec % 60}s` })
    },
}

// /info/dictionary — Dictionary definition (Free Dictionary API)
import axios from "axios"

export default {
    route: {
        method: "get",
        path: "/info/dictionary",
        auth: false,
        tags: ["Info"],
        summary: "Dictionary definition (English)",
        description: "Cari definisi kata bahasa Inggris via Free Dictionary API. Mendukung multiple bahasa.",
        parameters: [
            { name: "word", in: "query", required: true, description: "Kata yang dicari", schema: { type: "string", example: "hello" } },
            { name: "lang", in: "query", required: false, description: "Kode bahasa (default en)", schema: { type: "string", default: "en", example: "en" } },
        ],
        responses: { "200": { description: "Definisi" }, "400": { description: "Parameter tidak valid" }, "404": { description: "Kata tidak ditemukan" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const word = String(req.query.word || "").trim()
        if (!word) return res.status(400).json({ ok: false, error: "word wajib diisi" })
        const lang = String(req.query.lang || "en").trim().toLowerCase()
        try {
            const { data, status } = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/${encodeURIComponent(lang)}/${encodeURIComponent(word)}`, {
                timeout: 15000, validateStatus: () => true,
            })
            if (status === 404) return res.status(404).json({ ok: false, error: "Kata tidak ditemukan di kamus" })
            if (status !== 200) return res.status(502).json({ ok: false, error: `Dictionary API error ${status}` })
            const meanings = []
            for (const entry of data) {
                for (const m of entry.meanings || []) {
                    meanings.push({
                        part_of_speech: m.partOfSpeech,
                        definitions: (m.definitions || []).map(d => ({ definition: d.definition, example: d.example || null, synonyms: d.synonyms || [] })),
                        synonyms: m.synonyms || [],
                    })
                }
            }
            const phonetic = data[0]?.phonetic || data[0]?.phonetics?.find(p => p.text)?.text || null
            const audio = data[0]?.phonetics?.find(p => p.audio)?.audio || null
            res.json({ ok: true, word, language: lang, phonetic, audio_url: audio, meanings })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

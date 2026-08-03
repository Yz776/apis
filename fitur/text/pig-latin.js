// /text/pig-latin — convert text to Pig Latin
const VOWELS = "aeiouAEIOU"

function pigWord(word) {
    if (!word || !/^[a-zA-Z]/.test(word)) return word
    // capture leading punctuation
    const m = word.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/)
    if (!m) return word
    const [, pre, w, post] = m
    if (VOWELS.includes(w[0])) return pre + w + "yay" + post
    // find first vowel
    let i = 0
    while (i < w.length && !VOWELS.includes(w[i])) i++
    if (i === w.length) return pre + w + "ay" + post
    return pre + w.slice(i) + w.slice(0, i) + "ay" + post
}

export default {
    route: {
        method: "get",
        path: "/text/pig-latin",
        auth: false,
        tags: ["Text"],
        summary: "Pig Latin converter",
        description: "Ubah teks ke Pig Latin (permainan bahasa Inggris).",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "hello world" } },
        ],
        responses: { "200": { description: "Teks Pig Latin" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const result = String(text).split(/\s+/).map(pigWord).join(" ")
        res.json({ ok: true, input: String(text), result })
    },
}

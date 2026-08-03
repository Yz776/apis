// /utils/lorem-ipsum — Lorem ipsum generator
const WORDS = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(" ")

function rand(n) { return Math.floor(Math.random() * n) }
function sentence(minW = 5, maxW = 15) {
    const n = minW + rand(maxW - minW + 1)
    const words = []
    for (let i = 0; i < n; i++) words.push(WORDS[rand(WORDS.length)])
    let s = words.join(" ")
    s = s.charAt(0).toUpperCase() + s.slice(1) + "."
    return s
}
function paragraph(minS = 3, maxS = 7) {
    const n = minS + rand(maxS - minS + 1)
    const arr = []
    for (let i = 0; i < n; i++) arr.push(sentence())
    return arr.join(" ")
}

export default {
    route: {
        method: "get",
        path: "/utils/lorem-ipsum",
        auth: false,
        tags: ["Utils"],
        summary: "Lorem ipsum generator",
        description: "Membuat teks placeholder Lorem Ipsum. Bisa minta per kata, kalimat, atau paragraf.",
        parameters: [
            { name: "type", in: "query", required: false, description: "Jenis output: words, sentences, atau paragraphs (default paragraphs)", schema: { type: "string", enum: ["words", "sentences", "paragraphs"], default: "paragraphs" } },
            { name: "count", in: "query", required: false, description: "Jumlah (1-50, default 3)", schema: { type: "integer", default: 3, example: 5 } },
        ],
        responses: { "200": { description: "Teks Lorem Ipsum" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const type = String(req.query.type || "paragraphs").toLowerCase()
        let count = parseInt(req.query.count, 10) || 3
        if (count < 1) count = 1
        if (count > 50) count = 50
        let result
        if (type === "words") {
            const arr = []
            for (let i = 0; i < count; i++) arr.push(WORDS[rand(WORDS.length)])
            result = arr.join(" ")
        } else if (type === "sentences") {
            const arr = []
            for (let i = 0; i < count; i++) arr.push(sentence())
            result = arr.join(" ")
        } else if (type === "paragraphs") {
            const arr = []
            for (let i = 0; i < count; i++) arr.push(paragraph())
            result = arr.join("\n\n")
        } else return res.status(400).json({ ok: false, error: "type harus words, sentences, atau paragraphs" })
        res.json({ ok: true, type, count, text: result })
    },
}

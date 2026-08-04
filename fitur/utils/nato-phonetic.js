// /utils/nato-phonetic — text to NATO phonetic alphabet
const NATO = {
    A: "Alfa", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo", F: "Foxtrot", G: "Golf",
    H: "Hotel", I: "India", J: "Juliett", K: "Kilo", L: "Lima", M: "Mike", N: "November",
    O: "Oscar", P: "Papa", Q: "Quebec", R: "Romeo", S: "Sierra", T: "Tango", U: "Uniform",
    V: "Victor", W: "Whiskey", X: "X-ray", Y: "Yankee", Z: "Zulu",
    "0": "Zero", "1": "One", "2": "Two", "3": "Three", "4": "Four", "5": "Five",
    "6": "Six", "7": "Seven", "8": "Eight", "9": "Nine",
}

export default {
    route: {
        method: "get",
        path: "/utils/nato-phonetic",
        auth: false,
        tags: ["Utils"],
        summary: "NATO phonetic alphabet converter",
        description: "Ubah teks ke alphabet fonetik NATO (Alfa, Bravo, Charlie, ...).",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "SOS" } },
            { name: "sep", in: "query", required: false, description: "Pemisah (default dash)", schema: { type: "string", default: "-" } },
        ],
        responses: { "200": { description: "Hasil NATO phonetic" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const sep = req.query.sep !== undefined ? req.query.sep : "-"
        const s = String(text).toUpperCase()
        const result = []
        const skipped = []
        for (const c of s) {
            if (NATO[c]) result.push(NATO[c])
            else if (c === " ") result.push("[space]")
            else skipped.push(c)
        }
        res.json({ ok: true, input: String(text), result: result.join(sep), words: result, skipped })
    },
}

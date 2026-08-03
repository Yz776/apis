// /utils/braille — text to Braille Unicode
const BRAILLE = {
    a: "⠁", b: "⠃", c: "⠉", d: "⠙", e: "⠑", f: "⠋", g: "⠛", h: "⠓",
    i: "⠊", j: "⠚", k: "⠅", l: "⠇", m: "⠍", n: "⠝", o: "⠕", p: "⠏",
    q: "⠟", r: "⠗", s: "⠎", t: "⠞", u: "⠥", v: "⠧", w: "⠺", x: "⠭",
    y: "⠽", z: "⠵",
    "1": "⠂", "2": "⠆", "3": "⠒", "4": "⠲", "5": "⠢", "6": "⠖",
    "7": "⠶", "8": "⠦", "9": "⠔", "0": "⠴",
    " ": " ", ".": "⠨", ",": "⠠", "?": "⠮", "!": "⠮", "'": "⠄", "-": "⠤",
}

export default {
    route: {
        method: "get",
        path: "/utils/braille",
        auth: false,
        tags: ["Utils"],
        summary: "Text to Braille Unicode",
        description: "Ubah teks alfabet/angka ke Braille Unicode (U+2800–U+283F).",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo dunia" } },
        ],
        responses: { "200": { description: "Hasil Braille" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const s = String(text).toLowerCase()
        let result = ""
        const skipped = []
        for (const c of s) {
            if (BRAILLE[c]) result += BRAILLE[c]
            else { result += c; skipped.push(c) }
        }
        res.json({ ok: true, input: String(text), result, skipped })
    },
}

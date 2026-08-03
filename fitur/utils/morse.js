// /utils/morse — Morse code encoder/decoder
const TO_MORSE = {
    A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..",
    J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.",
    S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
    "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
    "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
    ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--",
    "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...",
    ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-",
    '"': ".-..-.", "@": ".--.-.", " ": "/",
}
const FROM_MORSE = Object.fromEntries(Object.entries(TO_MORSE).map(([k, v]) => [v, k]))

export default {
    route: {
        method: "get",
        path: "/utils/morse",
        auth: false,
        tags: ["Utils"],
        summary: "Morse code encoder/decoder",
        description: "Encode teks ke Morse code atau decode Morse code ke teks. Spasi antar huruf = ' ', antar kata = ' / '.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "SOS" } },
            { name: "mode", in: "query", required: false, description: "encode atau decode (default encode)", schema: { type: "string", enum: ["encode", "decode"], default: "encode" } },
        ],
        responses: { "200": { description: "Hasil" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const mode = String(req.query.mode || "encode").toLowerCase()
        try {
            let result
            if (mode === "encode") {
                const upper = String(text).toUpperCase()
                const words = upper.split(/\s+/)
                result = words.map(w => Array.from(w).map(c => TO_MORSE[c] || "").filter(Boolean).join(" ")).join(" / ")
            } else if (mode === "decode") {
                const words = String(text).split(/\s*\/\s*/)
                result = words.map(w => w.trim().split(/\s+/).map(m => FROM_MORSE[m] || "").join("")).join(" ")
            } else return res.status(400).json({ ok: false, error: "mode harus encode atau decode" })
            res.json({ ok: true, mode, input: String(text), result })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

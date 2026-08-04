// /utils/unicode-info — Unicode codepoint info
export default {
    route: {
        method: "get",
        path: "/utils/unicode-info",
        auth: false,
        tags: ["Utils"],
        summary: "Unicode codepoint info",
        description: "Mengembalikan informasi tentang codepoint Unicode: decimal, hex, UTF-8, UTF-16, nama blok.",
        parameters: [
            { name: "char", in: "query", required: false, description: "Karakter (cth: A atau 中)", schema: { type: "string", example: "A" } },
            { name: "codepoint", in: "query", required: false, description: "Codepoint (cth: 0x0041 atau 65 atau U+0041)", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Info codepoint" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        try {
            let codepoint
            if (req.query.codepoint) {
                const cp = String(req.query.codepoint).replace(/^U\+/i, "").replace(/^0x/i, "")
                codepoint = parseInt(cp, cp.startsWith("0x") || /^\d+$/.test(cp) ? (cp.startsWith("0x") ? 16 : 10) : 16)
                if (isNaN(codepoint)) return res.status(400).json({ ok: false, error: "codepoint tidak valid" })
            } else if (req.query.char) {
                const ch = String(req.query.char)
                codepoint = ch.codePointAt(0)
            } else {
                return res.status(400).json({ ok: false, error: "char atau codepoint wajib diisi" })
            }
            if (codepoint < 0 || codepoint > 0x10ffff) return res.status(400).json({ ok: false, error: "codepoint di luar rentang Unicode (0 - 0x10FFFF)" })
            const char = String.fromCodePoint(codepoint)
            // determine block
            const blocks = [
                [0x0000, 0x007F, "Basic Latin"],
                [0x0080, 0x00FF, "Latin-1 Supplement"],
                [0x0100, 0x017F, "Latin Extended-A"],
                [0x4E00, 0x9FFF, "CJK Unified Ideographs"],
                [0x3040, 0x309F, "Hiragana"],
                [0x30A0, 0x30FF, "Katakana"],
                [0xAC00, 0xD7AF, "Hangul Syllables"],
                [0x1F600, 0x1F64F, "Emoticons"],
                [0x1F300, 0x1F5FF, "Miscellaneous Symbols and Pictographs"],
                [0x2600, 0x26FF, "Miscellaneous Symbols"],
            ]
            let block = "Other"
            for (const [s, e, n] of blocks) {
                if (codepoint >= s && codepoint <= e) { block = n; break }
            }
            const utf8 = []
            for (const b of Buffer.from(char, "utf8")) utf8.push(b.toString(16).toUpperCase().padStart(2, "0"))
            const utf16 = []
            for (let i = 0; i < char.length; i++) utf16.push(char.charCodeAt(i).toString(16).toUpperCase().padStart(4, "0"))
            res.json({
                ok: true,
                char,
                codepoint_decimal: codepoint,
                codepoint_hex: `0x${codepoint.toString(16).toUpperCase().padStart(4, "0")}`,
                codepoint_unicode: `U+${codepoint.toString(16).toUpperCase().padStart(4, "0")}`,
                utf8_hex: utf8.join(" "),
                utf8_bytes: utf8.length,
                utf16_hex: utf16.join(" "),
                utf16_units: utf16.length,
                block,
                is_printable: codepoint >= 0x20 && !(codepoint >= 0x7F && codepoint <= 0x9F),
                is_ascii: codepoint <= 0x7F,
                category: codepoint <= 0x7F ? "ASCII" : "Unicode",
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

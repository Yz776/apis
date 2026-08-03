// /text/char-info — Unicode character info
function charInfo(ch) {
    const code = ch.codePointAt(0)
    return {
        char: ch,
        codepoint: "U+" + code.toString(16).toUpperCase().padStart(4, "0"),
        decimal: code,
        html_entity: `&#${code};`,
        html_hex: `&#x${code.toString(16)};`,
        utf8: Buffer.from(ch, "utf8").toString("hex").match(/.{2}/g).map(b => "%" + b).join("").toUpperCase(),
        name: tryName(code),
        block: tryBlock(code),
    }
}
function tryName(c) {
    // common ranges
    if (c >= 0x30 && c <= 0x39) return "DIGIT " + String.fromCodePoint(c)
    if (c >= 0x41 && c <= 0x5A) return "LATIN CAPITAL LETTER " + String.fromCodePoint(c)
    if (c >= 0x61 && c <= 0x7A) return "LATIN SMALL LETTER " + String.fromCodePoint(c).toUpperCase()
    return null
}
function tryBlock(c) {
    const blocks = [
        [0x0000, 0x007F, "Basic Latin"],
        [0x0080, 0x00FF, "Latin-1 Supplement"],
        [0x0100, 0x017F, "Latin Extended-A"],
        [0x1F300, 0x1F5FF, "Miscellaneous Symbols and Pictographs"],
        [0x1F600, 0x1F64F, "Emoticons"],
        [0x1F680, 0x1F6FF, "Transport and Map Symbols"],
        [0x2600, 0x26FF, "Miscellaneous Symbols"],
        [0x2700, 0x27BF, "Dingbats"],
    ]
    for (const [a, b, n] of blocks) if (c >= a && c <= b) return n
    return "Unknown"
}

export default {
    route: {
        method: "get",
        path: "/text/char-info",
        auth: false,
        tags: ["Text"],
        summary: "Unicode character info",
        description: "Menampilkan informasi karakter Unicode: codepoint, nama, html entity, UTF-8 bytes, block.",
        parameters: [
            { name: "char", in: "query", required: true, description: "Satu karakter (atau string, hanya karakter pertama)", schema: { type: "string", example: "A" } },
        ],
        responses: { "200": { description: "Info karakter" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const c = String(req.query.char || "")
        if (!c) return res.status(400).json({ ok: false, error: "char wajib diisi" })
        const first = Array.from(c)[0]
        if (!first) return res.status(400).json({ ok: false, error: "char harus berisi minimal 1 karakter" })
        res.json({ ok: true, ...charInfo(first) })
    },
}

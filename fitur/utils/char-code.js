// /utils/char-code — Character <-> ASCII/Unicode code conversion
export default {
    route: {
        method: "get",
        path: "/utils/char-code",
        auth: false,
        tags: ["Utils"],
        summary: "Char <-> ASCII/Unicode code",
        description: "Konversi karakter ke kode ASCII/Unicode atau sebaliknya. Mendukung string multi-char.",
        parameters: [
            { name: "text", in: "query", required: false, description: "Teks yang akan dikonversi ke kode", schema: { type: "string", example: "ABC" } },
            { name: "codes", in: "query", required: false, description: "Daftar kode dipisah koma (cth: 65,66,67)", schema: { type: "string", example: "65,66,67" } },
            { name: "base", in: "query", required: false, description: "Basis kode (10=decimal, 16=hex, 8=octal, 2=binary). Default 10", schema: { type: "integer", default: 10, enum: [2, 8, 10, 16] } },
        ],
        responses: { "200": { description: "Hasil konversi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const base = parseInt(req.query.base) || 10
        try {
            if (req.query.codes) {
                const codes = String(req.query.codes).split(",").map(s => s.trim()).filter(Boolean)
                const chars = []
                for (const c of codes) {
                    const code = parseInt(c, base)
                    if (isNaN(code)) return res.status(400).json({ ok: false, error: `kode "${c}" tidak valid di basis ${base}` })
                    chars.push(String.fromCodePoint(code))
                }
                return res.json({ ok: true, mode: "code_to_char", base, codes, result: chars.join(""), chars })
            }
            if (req.query.text) {
                const text = String(req.query.text)
                const codes = []
                for (const ch of text) codes.push(ch.codePointAt(0).toString(base))
                return res.json({ ok: true, mode: "char_to_code", base, text, codes, codes_str: codes.join(", ") })
            }
            res.status(400).json({ ok: false, error: "text atau codes wajib diisi" })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

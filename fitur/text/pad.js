// /text/pad — pad text left/right/center
export default {
    route: {
        method: "get",
        path: "/text/pad",
        auth: false,
        tags: ["Text"],
        summary: "Pad text (left/right/center)",
        description: "Tambahkan karakter padding ke teks sampai panjang tertentu.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo" } },
            { name: "length", in: "query", required: false, description: "Panjang target (default 10)", schema: { type: "integer", default: 10, example: 10 } },
            { name: "char", in: "query", required: false, description: "Karakter padding (default spasi)", schema: { type: "string", default: " " } },
            { name: "mode", in: "query", required: false, description: "left/right/center (default right)", schema: { type: "string", enum: ["left", "right", "center"], default: "right" } },
        ],
        responses: { "200": { description: "Teks ter-pad" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        let len = parseInt(req.query.length, 10) || 10
        if (len < 0) len = 0
        let char = req.query.char !== undefined ? req.query.char : " "
        if (!char) char = " "
        char = String(char)[0] || " "
        const mode = String(req.query.mode || "right").toLowerCase()
        const s = String(text)
        if (s.length >= len) return res.json({ ok: true, input: s, result: s })
        const padLen = len - s.length
        let result
        if (mode === "left") result = char.repeat(padLen) + s
        else if (mode === "right") result = s + char.repeat(padLen)
        else { // center
            const left = Math.floor(padLen / 2)
            const right = padLen - left
            result = char.repeat(left) + s + char.repeat(right)
        }
        res.json({ ok: true, input: s, mode, length: len, result })
    },
}

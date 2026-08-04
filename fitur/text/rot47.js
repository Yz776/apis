// /text/rot47 — ROT47 cipher
function rot47(str) {
    return str.split("").map(ch => {
        const c = ch.charCodeAt(0)
        if (c >= 33 && c <= 126) return String.fromCharCode(33 + ((c - 33 + 47) % 94))
        return ch
    }).join("")
}

export default {
    route: {
        method: "get",
        path: "/text/rot47",
        auth: false,
        tags: ["Text"],
        summary: "ROT47 cipher",
        description: "ROT47 cipher — rotasi 47 karakter ASCII printable. Self-inverse: apply 2x untuk decode.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "Hello World" } },
        ],
        responses: { "200": { description: "Hasil ROT47" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = String(req.query.text || "")
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        try {
            const result = rot47(text)
            res.json({ ok: true, input: text, result })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

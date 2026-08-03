// /text/wrap — word wrap text to fixed width
export default {
    route: {
        method: "get",
        path: "/text/wrap",
        auth: false,
        tags: ["Text"],
        summary: "Word wrap text",
        description: "Lipat teks ke baris-baris dengan lebar tertentu (word wrap).",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod" } },
            { name: "width", in: "query", required: false, description: "Lebar baris (default 80)", schema: { type: "integer", default: 80, example: 20 } },
            { name: "break_long", in: "query", required: false, description: "Pecah kata yang lebih panjang dari width (default false)", schema: { type: "boolean", default: false } },
        ],
        responses: { "200": { description: "Teks ter-wrap" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        let width = parseInt(req.query.width, 10) || 80
        if (width < 1) width = 1
        const breakLong = String(req.query.break_long).toLowerCase() === "true"
        const paragraphs = String(text).split(/\n/)
        const out = []
        for (const para of paragraphs) {
            const words = para.split(/\s+/).filter(Boolean)
            let line = ""
            for (const w of words) {
                if (w.length > width && breakLong) {
                    if (line) { out.push(line); line = "" }
                    let rest = w
                    while (rest.length > width) { out.push(rest.slice(0, width)); rest = rest.slice(width) }
                    line = rest
                    continue
                }
                if (!line) line = w
                else if ((line + " " + w).length <= width) line += " " + w
                else { out.push(line); line = w }
            }
            if (line) out.push(line)
            if (!words.length) out.push("")
        }
        res.json({ ok: true, input: String(text), width, lines: out, line_count: out.length, wrapped: out.join("\n") })
    },
}

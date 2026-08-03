// /text/escape — HTML/URL/JSON escape
const HTML_ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }
const HTML_UNESC = Object.fromEntries(Object.entries(HTML_ESC).map(([k, v]) => [v, k]))

export default {
    route: {
        method: "get",
        path: "/text/escape",
        auth: false,
        tags: ["Text"],
        summary: "HTML/URL escape & unescape",
        description: "Escape atau unescape HTML entities dan URL encoding.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "<b>halo & dunia</b>" } },
            { name: "type", in: "query", required: false, description: "html atau url (default html)", schema: { type: "string", enum: ["html", "url"], default: "html" } },
            { name: "mode", in: "query", required: false, description: "escape atau unescape (default escape)", schema: { type: "string", enum: ["escape", "unescape"], default: "escape" } },
        ],
        responses: { "200": { description: "Hasil" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const type = String(req.query.type || "html").toLowerCase()
        const mode = String(req.query.mode || "escape").toLowerCase()
        let result
        if (type === "html") {
            if (mode === "escape") result = String(text).replace(/[&<>"']/g, c => HTML_ESC[c])
            else if (mode === "unescape") result = String(text).replace(/&[^;]+;/g, e => HTML_UNESC[e] || e)
            else return res.status(400).json({ ok: false, error: "mode harus escape atau unescape" })
        } else if (type === "url") {
            if (mode === "escape") result = encodeURIComponent(String(text))
            else if (mode === "unescape") result = decodeURIComponent(String(text))
            else return res.status(400).json({ ok: false, error: "mode harus escape atau unescape" })
        } else return res.status(400).json({ ok: false, error: "type harus html atau url" })
        res.json({ ok: true, type, mode, input: String(text), result })
    },
}

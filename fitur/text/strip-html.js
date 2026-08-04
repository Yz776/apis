// /text/strip-html — strip HTML tags from text
export default {
    route: {
        method: "get",
        path: "/text/strip-html",
        auth: false,
        tags: ["Text"],
        summary: "Strip HTML tags",
        description: "Hapus semua tag HTML dari teks, sisakan teks bersih.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks HTML input", schema: { type: "string", example: "<p>Halo <b>dunia</b> &amp; semuanya</p>" } },
            { name: "decode_entities", in: "query", required: false, description: "Decode HTML entities (default true)", schema: { type: "boolean", default: true } },
            { name: "trim", in: "query", required: false, description: "Trim whitespace (default true)", schema: { type: "boolean", default: true } },
        ],
        responses: { "200": { description: "Teks bersih tanpa HTML" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const decodeEntities = String(req.query.decode_entities).toLowerCase() !== "false"
        const trim = String(req.query.trim).toLowerCase() !== "false"
        let result = String(text)
        // remove script/style content
        result = result.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
        // remove tags
        result = result.replace(/<[^>]+>/g, "")
        // decode common entities
        if (decodeEntities) {
            const entities = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " " }
            result = result.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, m => entities[m] || m)
            result = result.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
            result = result.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
        }
        // collapse whitespace
        result = result.replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n")
        if (trim) result = result.trim()
        res.json({ ok: true, input: String(text), result, length: result.length })
    },
}

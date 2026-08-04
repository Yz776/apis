// /text/case — Text case converter
function toTitle(s) { return s.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()) }
function toCamel(s) { return s.replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^./, c => c.toLowerCase()) }
function toPascal(s) { const c = toCamel(s); return c.charAt(0).toUpperCase() + c.slice(1) }
function toSnake(s) { return s.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[\s\-]+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() }
function toKebab(s) { return s.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[\s_]+/g, "-").replace(/[^a-zA-Z0-9\-]/g, "").toLowerCase() }
function toConstant(s) { return toSnake(s).toUpperCase() }

export default {
    route: {
        method: "get",
        path: "/text/case",
        auth: false,
        tags: ["Text"],
        summary: "Text case converter",
        description: "Konversi teks ke berbagai format: upper, lower, title, camel, pascal, snake, kebab, constant.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo dunia selamat" } },
            { name: "to", in: "query", required: false, description: "Target case (default lower)", schema: { type: "string", enum: ["upper", "lower", "title", "camel", "pascal", "snake", "kebab", "constant"], default: "lower" } },
        ],
        responses: { "200": { description: "Hasil konversi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const to = String(req.query.to || "lower").toLowerCase()
        const map = { upper: s => s.toUpperCase(), lower: s => s.toLowerCase(), title: toTitle, camel: toCamel, pascal: toPascal, snake: toSnake, kebab: toKebab, constant: toConstant }
        if (!map[to]) return res.status(400).json({ ok: false, error: "to tidak valid, pilih: " + Object.keys(map).join(", ") })
        res.json({ ok: true, input: String(text), to, result: map[to](String(text)) })
    },
}

// /info/avatar — Random avatar (DiceBear API - free, no key)
export default {
    route: {
        method: "get",
        path: "/info/avatar",
        auth: false,
        tags: ["Info"],
        summary: "Random avatar URL",
        description: "Generate URL avatar acak via DiceBear. Style: adventurer, bottts, fun-emoji, identicon, initials, lorelei, micah, etc.",
        parameters: [
            { name: "seed", in: "query", required: false, description: "Seed untuk hasil konsisten (default random)", schema: { type: "string", example: "john" } },
            { name: "style", in: "query", required: false, description: "Style avatar (default adventurer)", schema: { type: "string", default: "adventurer", example: "bottts" } },
            { name: "format", in: "query", required: false, description: "Format gambar (default svg)", schema: { type: "string", enum: ["svg", "png", "webp", "jpg"], default: "svg" } },
        ],
        responses: { "200": { description: "URL avatar" } },
    },
    handler: async (req, res) => {
        const seed = String(req.query.seed || Math.random().toString(36).slice(2, 10))
        const STYLES = ["adventurer", "adventurer-neutral", "avataaars", "big-ears", "big-smile", "bottts", "bottts-neutral", "croodles", "fun-emoji", "icons", "identicon", "initials", "lorelei", "lorelei-neutral", "micah", "miniavs", "open-peeps", "personas", "pixel-art", "shapes", "thumbs"]
        const style = STYLES.includes(req.query.style) ? req.query.style : "adventurer"
        const format = ["svg", "png", "webp", "jpg"].includes(req.query.format) ? req.query.format : "svg"
        const url = `https://api.dicebear.com/7.x/${style}/${format}?seed=${encodeURIComponent(seed)}`
        res.json({ ok: true, seed, style, format, url })
    },
}

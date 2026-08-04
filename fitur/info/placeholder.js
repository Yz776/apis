// /info/placeholder — Placeholder image generator (placehold.co - free, no key)
// Returns JSON metadata; actual image URL can be embedded directly.
export default {
    route: {
        method: "get",
        path: "/info/placeholder",
        auth: false,
        tags: ["Info"],
        summary: "Placeholder image URL",
        description: "Generate URL gambar placeholder dengan ukuran, warna, dan teks custom. URL bisa langsung dipakai di <img>.",
        parameters: [
            { name: "width", in: "query", required: false, description: "Lebar pixel (default 300)", schema: { type: "integer", default: 300, example: 600 } },
            { name: "height", in: "query", required: false, description: "Tinggi pixel (default 200)", schema: { type: "integer", default: 200, example: 400 } },
            { name: "text", in: "query", required: false, description: "Teks di gambar (default ukuran)", schema: { type: "string", example: "Hello World" } },
            { name: "bg", in: "query", required: false, description: "Warna background hex tanpa # (default cccccc)", schema: { type: "string", default: "cccccc", example: "ff6600" } },
            { name: "fg", in: "query", required: false, description: "Warna teks hex tanpa # (default 333333)", schema: { type: "string", default: "333333", example: "ffffff" } },
            { name: "format", in: "query", required: false, description: "Format gambar (default png)", schema: { type: "string", enum: ["png", "jpg", "gif", "webp"], default: "png" } },
        ],
        responses: { "200": { description: "URL placeholder" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        let w = parseInt(req.query.width, 10) || 300
        let h = parseInt(req.query.height, 10) || 200
        if (w < 1 || w > 4000) w = 300
        if (h < 1 || h > 4000) h = 200
        const text = req.query.text ? String(req.query.text).slice(0, 100) : null
        const bg = String(req.query.bg || "cccccc").replace(/[^0-9a-fA-F]/g, "").slice(0, 6) || "cccccc"
        const fg = String(req.query.fg || "333333").replace(/[^0-9a-fA-F]/g, "").slice(0, 6) || "333333"
        const fmt = String(req.query.format || "png").toLowerCase()
        const fmts = ["png", "jpg", "gif", "webp"]
        const format = fmts.includes(fmt) ? fmt : "png"
        const path = `${w}x${h}/${bg}/${fg}${text ? "/" + encodeURIComponent(text) : ""}.${format}`
        const url = `https://placehold.co/${path}`
        res.json({ ok: true, width: w, height: h, text, bg: "#" + bg, fg: "#" + fg, format, url })
    },
}

// /info/qr-api — QR code generator (via public API)
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/qr-api",
        auth: false,
        tags: ["Info"],
        summary: "QR code generator (PNG image URL)",
        description: "Generate QR code untuk teks atau URL. Mengembalikan URL gambar PNG dari QuickChart QR API.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks/URL yang akan di-encode", schema: { type: "string", example: "https://kangwifi.eu.org" } },
            { name: "size", in: "query", required: false, description: "Ukuran dalam pixel (default 200, max 1000)", schema: { type: "integer", default: 200 } },
            { name: "margin", in: "query", required: false, description: "Margin dalam modul (default 4)", schema: { type: "integer", default: 4 } },
            { name: "dark", in: "query", required: false, description: "Warna dark (hex tanpa #, default 000000)", schema: { type: "string", default: "000000" } },
            { name: "light", in: "query", required: false, description: "Warna light (hex tanpa #, default ffffff)", schema: { type: "string", default: "ffffff" } },
        ],
        responses: { "200": { description: "URL QR code" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = String(req.query.text || "")
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        try {
            const size = Math.min(1000, Math.max(50, parseInt(req.query.size) || 200))
            const margin = Math.min(20, Math.max(0, parseInt(req.query.margin) || 4))
            const dark = String(req.query.dark || "000000").replace(/^#/, "")
            const light = String(req.query.light || "ffffff").replace(/^#/, "")
            const url = `https://quickchart.io/qr?text=${encodeURIComponent(text)}&size=${size}&margin=${margin}&dark=${dark}&light=${light}`
            res.json({
                ok: true,
                input: text,
                size,
                margin,
                colors: { dark: `#${dark}`, light: `#${light}` },
                url,
                preview: `[![QR](${url})](${url})`,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

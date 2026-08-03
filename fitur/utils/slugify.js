// /utils/slugify — Slugify text
export default {
    route: {
        method: "get",
        path: "/utils/slugify",
        auth: false,
        tags: ["Utils"],
        summary: "Slugify teks",
        description: "Mengubah teks menjadi URL slug yang aman (lowercase, strip, tanpa karakter khusus).",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "Halo Dunia! Ini adalah Test." } },
            { name: "separator", in: "query", required: false, description: "Pemisah (default -)", schema: { type: "string", default: "-", example: "_" } },
        ],
        responses: { "200": { description: "Slug" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const sep = String(req.query.separator || "-").trim() || "-"
        const slug = String(text)
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/[\s\-_]+/g, sep)
            .replace(new RegExp(`^${sep}+|${sep}+$`, "g"), "")
        res.json({ ok: true, input: String(text), slug })
    },
}

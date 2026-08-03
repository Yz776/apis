// /utils/unit-data — digital data size converter
const TO_B = {
    bit: 0.125, b: 0.125,
    B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4, PB: 1024 ** 5, EB: 1024 ** 6, ZB: 1024 ** 7, YB: 1024 ** 8,
    KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, TiB: 1024 ** 4, PiB: 1024 ** 5,
    // decimal (SI)
    kB: 1000, MB_si: 1000 ** 2, GB_si: 1000 ** 3, TB_si: 1000 ** 4,
}

export default {
    route: {
        method: "get",
        path: "/utils/unit-data",
        auth: false,
        tags: ["Utils"],
        summary: "Digital data size converter",
        description: "Konversi satuan data digital: bit, B, KB, MB, GB, TB, PB, EB, ZB, YB (biner) & KiB/MiB/GiB/TiB/PiB.",
        parameters: [
            { name: "value", in: "query", required: true, description: "Nilai", schema: { type: "number", example: 1 } },
            { name: "from", in: "query", required: true, description: "Satuan asal", schema: { type: "string", example: "GB" } },
            { name: "to", in: "query", required: false, description: "Satuan tujuan (jika kosong, semua)", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Hasil konversi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const value = parseFloat(req.query.value)
        if (isNaN(value)) return res.status(400).json({ ok: false, error: "value wajib angka" })
        const from = String(req.query.from || "")
        if (!TO_B[from]) return res.status(400).json({ ok: false, error: "from tidak valid" })
        const bytes = value * TO_B[from]
        const to = req.query.to ? String(req.query.to) : null
        if (to) {
            if (!TO_B[to]) return res.status(400).json({ ok: false, error: "to tidak valid" })
            return res.json({ ok: true, value, from, to, result: bytes / TO_B[to] })
        }
        const common = ["bit", "B", "KB", "MB", "GB", "TB", "PB", "EB"]
        const all = {}
        for (const u of common) all[u] = bytes / TO_B[u]
        res.json({ ok: true, value, from, bytes, conversions: all })
    },
}

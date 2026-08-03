// /utils/unit-length — length unit converter
const TO_M = {
    mm: 0.001, cm: 0.01, m: 1, km: 1000,
    in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344,
    nmi: 1852, league: 4828.032, furlong: 201.168, chain: 20.1168,
}

export default {
    route: {
        method: "get",
        path: "/utils/unit-length",
        auth: false,
        tags: ["Utils"],
        summary: "Length unit converter",
        description: "Konversi satuan panjang: mm, cm, m, km, in, ft, yd, mi, nmi, league, furlong, chain.",
        parameters: [
            { name: "value", in: "query", required: true, description: "Nilai", schema: { type: "number", example: 1 } },
            { name: "from", in: "query", required: true, description: "Satuan asal", schema: { type: "string", enum: Object.keys(TO_M), example: "km" } },
            { name: "to", in: "query", required: false, description: "Satuan tujuan (jika kosong, konversi ke semua)", schema: { type: "string", enum: Object.keys(TO_M) } },
        ],
        responses: { "200": { description: "Hasil konversi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const value = parseFloat(req.query.value)
        if (isNaN(value)) return res.status(400).json({ ok: false, error: "value wajib angka" })
        const from = String(req.query.from || "").toLowerCase()
        if (!TO_M[from]) return res.status(400).json({ ok: false, error: "from tidak valid" })
        const meters = value * TO_M[from]
        const to = req.query.to ? String(req.query.to).toLowerCase() : null
        if (to) {
            if (!TO_M[to]) return res.status(400).json({ ok: false, error: "to tidak valid" })
            return res.json({ ok: true, value, from, to, result: meters / TO_M[to] })
        }
        const all = {}
        for (const [u, factor] of Object.entries(TO_M)) all[u] = meters / factor
        res.json({ ok: true, value, from, meters, conversions: all })
    },
}

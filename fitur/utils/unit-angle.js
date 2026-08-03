// /utils/unit-angle — angle unit converter
function toDeg(value, from) {
    if (from === "deg") return value
    if (from === "rad") return value * 180 / Math.PI
    if (from === "grad") return value * 0.9
    if (from === "turn") return value * 360
    if (from === "arcmin") return value / 60
    if (from === "arcsec") return value / 3600
    throw new Error("from tidak valid")
}
function fromDeg(deg, to) {
    if (to === "deg") return deg
    if (to === "rad") return deg * Math.PI / 180
    if (to === "grad") return deg / 0.9
    if (to === "turn") return deg / 360
    if (to === "arcmin") return deg * 60
    if (to === "arcsec") return deg * 3600
    throw new Error("to tidak valid")
}

const UNITS = ["deg", "rad", "grad", "turn", "arcmin", "arcsec"]

export default {
    route: {
        method: "get",
        path: "/utils/unit-angle",
        auth: false,
        tags: ["Utils"],
        summary: "Angle unit converter",
        description: "Konversi sudut: derajat, radian, gradian, turn, arcmin, arcsec.",
        parameters: [
            { name: "value", in: "query", required: true, description: "Nilai", schema: { type: "number", example: 90 } },
            { name: "from", in: "query", required: true, description: "Satuan asal", schema: { type: "string", enum: UNITS, example: "deg" } },
            { name: "to", in: "query", required: false, description: "Satuan tujuan (jika kosong, semua)", schema: { type: "string", enum: UNITS } },
        ],
        responses: { "200": { description: "Hasil konversi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const value = parseFloat(req.query.value)
        if (isNaN(value)) return res.status(400).json({ ok: false, error: "value wajib angka" })
        const from = String(req.query.from || "").toLowerCase()
        if (!UNITS.includes(from)) return res.status(400).json({ ok: false, error: "from tidak valid" })
        try {
            const deg = toDeg(value, from)
            const to = req.query.to ? String(req.query.to).toLowerCase() : null
            if (to) {
                if (!UNITS.includes(to)) return res.status(400).json({ ok: false, error: "to tidak valid" })
                return res.json({ ok: true, value, from, to, result: fromDeg(deg, to) })
            }
            const all = {}
            for (const u of UNITS) all[u] = fromDeg(deg, u)
            res.json({ ok: true, value, from, deg, conversions: all })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

// /info/moon-phase — moon phase for date (computed)
function moonPhase(date) {
    // Julian day
    const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate()
    let yy = y, mm = m
    if (mm < 3) { yy--; mm += 12 }
    const K = Math.floor(yy / 100)
    const JD = 365.25 * (yy + 4716) + 30.6001 * (mm + 1) + d + 2 - K + Math.floor(K / 4) - 1524.5
    // Reference new moon: 2000-01-06 18:14 UTC = JD 2451550.1
    const NM = 2451550.1
    const synodic = 29.53058867
    const days = (JD - NM) % synodic
    const phase = days < 0 ? days + synodic : days
    const phaseFrac = phase / synodic
    const illum = (1 - Math.cos(2 * Math.PI * phaseFrac)) / 2  // illuminated fraction
    let name
    if (phase < 1.84566) name = "New Moon"
    else if (phase < 5.53699) name = "Waxing Crescent"
    else if (phase < 9.22831) name = "First Quarter"
    else if (phase < 12.91963) name = "Waxing Gibbous"
    else if (phase < 16.61096) name = "Full Moon"
    else if (phase < 20.30228) name = "Waning Gibbous"
    else if (phase < 23.99361) name = "Last Quarter"
    else if (phase < 27.68493) name = "Waning Crescent"
    else name = "New Moon"
    return { phase_age_days: Number(phase.toFixed(2)), phase_fraction: Number(phaseFrac.toFixed(4)), illumination: Number(illum.toFixed(4)), name }
}

export default {
    route: {
        method: "get",
        path: "/info/moon-phase",
        auth: false,
        tags: ["Info"],
        summary: "Moon phase for date",
        description: "Fase bulan (new moon, full moon, dll.) untuk tanggal tertentu. Dihitung astronomis.",
        parameters: [
            { name: "date", in: "query", required: false, description: "Tanggal YYYY-MM-DD (default hari ini UTC)", schema: { type: "string", example: "2026-08-03" } },
        ],
        responses: { "200": { description: "Fase bulan" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        let date
        if (req.query.date) {
            const d = new Date(String(req.query.date) + "T00:00:00Z")
            if (isNaN(d.getTime())) return res.status(400).json({ ok: false, error: "date tidak valid (YYYY-MM-DD)" })
            date = d
        } else date = new Date()
        const result = moonPhase(date)
        res.json({ ok: true, date: date.toISOString().slice(0, 10), ...result })
    },
}

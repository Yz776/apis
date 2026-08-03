// /info/age — Age calculator from birthday
function calcAge(birth, target) {
    const b = new Date(birth)
    const t = new Date(target)
    let years = t.getFullYear() - b.getFullYear()
    let months = t.getMonth() - b.getMonth()
    let days = t.getDate() - b.getDate()
    if (days < 0) {
        months--
        const prev = new Date(t.getFullYear(), t.getMonth(), 0).getDate()
        days += prev
    }
    if (months < 0) { years--; months += 12 }
    const totalDays = Math.floor((t - b) / 86400000)
    return { years, months, days, total_days: totalDays, total_weeks: Math.floor(totalDays / 7), total_hours: totalDays * 24, next_birthday: nextBirthday(b, t) }
}
function nextBirthday(birth, from) {
    const nb = new Date(from.getFullYear(), birth.getMonth(), birth.getDate())
    if (nb < from) nb.setFullYear(nb.getFullYear() + 1)
    const days = Math.ceil((nb - from) / 86400000)
    return { date: nb.toISOString().slice(0, 10), days_until: days }
}

export default {
    route: {
        method: "get",
        path: "/info/age",
        auth: false,
        tags: ["Info"],
        summary: "Age calculator",
        description: "Menghitung umur dari tanggal lahir. Bisa target custom (default: hari ini).",
        parameters: [
            { name: "birth", in: "query", required: true, description: "Tanggal lahir (YYYY-MM-DD)", schema: { type: "string", example: "1990-05-15" } },
            { name: "target", in: "query", required: false, description: "Tanggal target (default: hari ini)", schema: { type: "string", example: "2025-01-01" } },
        ],
        responses: { "200": { description: "Umur" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const birth = String(req.query.birth || "").trim()
        if (!birth) return res.status(400).json({ ok: false, error: "birth wajib diisi (YYYY-MM-DD)" })
        const bd = new Date(birth)
        if (isNaN(bd.getTime())) return res.status(400).json({ ok: false, error: "Format birth harus YYYY-MM-DD" })
        const target = req.query.target ? new Date(req.query.target) : new Date()
        if (isNaN(target.getTime())) return res.status(400).json({ ok: false, error: "Format target tidak valid" })
        if (bd > target) return res.status(400).json({ ok: false, error: "Tanggal lahir tidak boleh di masa depan" })
        const age = calcAge(bd, target)
        res.json({ ok: true, birth: bd.toISOString().slice(0, 10), target: target.toISOString().slice(0, 10), age })
    },
}

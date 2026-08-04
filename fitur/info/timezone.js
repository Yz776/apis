// /info/timezone — list world timezones & current time
export default {
    route: {
        method: "get",
        path: "/info/timezone",
        auth: false,
        tags: ["Info"],
        summary: "World timezones & current time",
        description: "Daftar timezone IANA atau waktu saat ini di timezone tertentu.",
        parameters: [
            { name: "tz", in: "query", required: false, description: "Timezone IANA (mis. Asia/Jakarta). Jika kosong, list semua.", schema: { type: "string", example: "Asia/Jakarta" } },
        ],
        responses: { "200": { description: "Timezone info / list" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        try {
            const tz = req.query.tz ? String(req.query.tz) : null
            if (tz) {
                try {
                    const now = new Date()
                    const formatter = new Intl.DateTimeFormat("en-US", {
                        timeZone: tz, dateStyle: "full", timeStyle: "long"
                    })
                    const parts = new Intl.DateTimeFormat("en-US", {
                        timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
                    }).formatToParts(now)
                    const obj = {}
                    for (const p of parts) if (p.type !== "literal") obj[p.type] = p.value
                    res.json({
                        ok: true,
                        timezone: tz,
                        current_time: formatter.format(now),
                        components: obj,
                        utc_offset: new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(now).find(p => p.type === "timeZoneName")?.value || "unknown",
                    })
                } catch (e) { return res.status(400).json({ ok: false, error: "timezone tidak valid: " + e.message }) }
            }
            // list common timezones via Intl
            const common = ["UTC", "Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Tokyo", "Asia/Shanghai", "Asia/Singapore", "Asia/Seoul", "Asia/Hong_Kong", "Asia/Bangkok", "Asia/Dubai", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow", "America/New_York", "America/Chicago", "America/Los_Angeles", "America/Sao_Paulo", "America/Toronto", "Australia/Sydney", "Pacific/Auckland"]
            const now = new Date()
            const list = common.map(t => {
                try {
                    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: t, dateStyle: "medium", timeStyle: "long" })
                    return { timezone: t, current_time: formatter.format(now) }
                } catch { return null }
            }).filter(Boolean)
            res.json({ ok: true, count: list.length, timezones: list })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

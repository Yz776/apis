// /info/time — Time info for any timezone
export default {
    route: {
        method: "get",
        path: "/info/time",
        auth: false,
        tags: ["Info"],
        summary: "Time in timezone",
        description: "Tampilkan waktu sekarang di timezone tertentu. Tanpa tz = UTC. Daftar tz populer: Asia/Jakarta, Asia/Makassar, Asia/Jayapura, UTC, America/New_York, Europe/London, Asia/Tokyo, dll.",
        parameters: [
            { name: "tz", in: "query", required: false, description: "Timezone IANA (default UTC)", schema: { type: "string", default: "UTC", example: "Asia/Jakarta" } },
        ],
        responses: { "200": { description: "Waktu" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const tz = String(req.query.tz || "UTC").trim()
        try {
            Intl.DateTimeFormat("en-US", { timeZone: tz })
        } catch {
            return res.status(400).json({ ok: false, error: "timezone tidak valid (mis. Asia/Jakarta)" })
        }
        const now = new Date()
        const fmt = (opts) => now.toLocaleString("sv-SE", { ...opts, timeZone: tz, hour12: false })
        res.json({
            ok: true,
            timezone: tz,
            iso_utc: now.toISOString(),
            date: fmt({ year: "numeric", month: "2-digit", day: "2-digit" }),
            time: fmt({ hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            datetime: fmt({ year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            weekday: now.toLocaleString("en-US", { weekday: "long", timeZone: tz }),
            unix: Math.floor(now.getTime() / 1000),
            unix_ms: now.getTime(),
            offset_minutes: -now.getTimezoneOffset(),
        })
    },
}

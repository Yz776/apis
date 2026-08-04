// /utils/timestamp — Unix timestamp converter
export default {
    route: {
        method: "get",
        path: "/utils/timestamp",
        auth: false,
        tags: ["Utils"],
        summary: "Unix timestamp converter",
        description: "Konversi antara Unix timestamp dan tanggal ISO. Tanpa parameter = timestamp sekarang. value=<ts> = ts ke ISO. value=<iso> = ISO ke ts.",
        parameters: [
            { name: "value", in: "query", required: false, description: "Unix timestamp (detik) atau tanggal ISO", schema: { type: "string", example: "1700000000" } },
            { name: "tz", in: "query", required: false, description: "Timezone IANA (default UTC)", schema: { type: "string", default: "UTC", example: "Asia/Jakarta" } },
        ],
        responses: { "200": { description: "Hasil konversi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const v = req.query.value ? String(req.query.value).trim() : null
        const tz = String(req.query.tz || "UTC")
        try {
            // validate tz
            Intl.DateTimeFormat("en-US", { timeZone: tz })
        } catch {
            return res.status(400).json({ ok: false, error: "timezone tidak valid (mis. Asia/Jakarta)" })
        }
        if (!v) {
            const now = Date.now()
            const d = new Date(now)
            return res.json({ ok: true, unix: Math.floor(now / 1000), unix_ms: now, iso_utc: d.toISOString(), iso_local: d.toLocaleString("sv-SE", { timeZone: tz, hour12: false }) + " (" + tz + ")", timezone: tz })
        }
        if (/^\d+$/.test(v)) {
            const ts = parseInt(v, 10)
            const ms = v.length > 10 ? ts : ts * 1000
            const d = new Date(ms)
            return res.json({ ok: true, input_type: "unix", input: ts, iso_utc: d.toISOString(), iso_local: d.toLocaleString("sv-SE", { timeZone: tz, hour12: false }) + " (" + tz + ")", timezone: tz })
        }
        const d = new Date(v)
        if (isNaN(d.getTime())) return res.status(400).json({ ok: false, error: "value harus Unix timestamp atau tanggal ISO yang valid" })
        return res.json({ ok: true, input_type: "iso", input: v, unix: Math.floor(d.getTime() / 1000), unix_ms: d.getTime(), iso_utc: d.toISOString(), iso_local: d.toLocaleString("sv-SE", { timeZone: tz, hour12: false }) + " (" + tz + ")", timezone: tz })
    },
}

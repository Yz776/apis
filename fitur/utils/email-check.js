// /utils/email-check — Email format validator (regex + DNS MX check)
import dns from "dns/promises"

const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

export default {
    route: {
        method: "get",
        path: "/utils/email-check",
        auth: false,
        tags: ["Utils"],
        summary: "Email format + MX validator",
        description: "Cek apakah email memiliki format valid dan domain memiliki MX record. Tidak menjamin mailbox ada.",
        parameters: [
            { name: "email", in: "query", required: true, description: "Alamat email", schema: { type: "string", example: "test@gmail.com" } },
        ],
        responses: { "200": { description: "Hasil validasi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const email = String(req.query.email || "").trim().toLowerCase()
        if (!email) return res.status(400).json({ ok: false, error: "email wajib diisi" })
        const format_valid = EMAIL_RE.test(email)
        if (!format_valid) return res.json({ ok: true, email, format_valid: false, mx_valid: false, reason: "Format email tidak valid" })
        const domain = email.split("@")[1]
        let mx_valid = false, mx_records = []
        try {
            const records = await dns.resolveMx(domain)
            if (records && records.length) { mx_valid = true; mx_records = records.map(r => r.exchange) }
        } catch {}
        res.json({ ok: true, email, format_valid, mx_valid, mx_records, reason: mx_valid ? "Domain menerima email" : "Domain tidak punya MX record" })
    },
}

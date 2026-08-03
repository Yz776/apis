// /info/dns — DNS lookup (using Google DNS-over-HTTPS, no key, very stable)
import axios from "axios"

const TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "PTR", "CAA", "SRV"]

export default {
    route: {
        method: "get",
        path: "/info/dns",
        auth: false,
        tags: ["Info"],
        summary: "DNS lookup",
        description: "Cari DNS record sebuah domain via Google DNS-over-HTTPS. Mendukung A, AAAA, CNAME, MX, NS, TXT, SOA, dll.",
        parameters: [
            { name: "domain", in: "query", required: true, description: "Nama domain (mis. example.com)", schema: { type: "string", example: "google.com" } },
            { name: "type", in: "query", required: false, description: "Jenis record (default A)", schema: { type: "string", enum: TYPES, default: "A" } },
        ],
        responses: { "200": { description: "Hasil DNS" }, "400": { description: "Parameter tidak valid" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const domain = String(req.query.domain || "").trim().toLowerCase()
        if (!domain) return res.status(400).json({ ok: false, error: "domain wajib diisi" })
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return res.status(400).json({ ok: false, error: "domain tidak valid" })
        const type = String(req.query.type || "A").toUpperCase()
        if (!TYPES.includes(type)) return res.status(400).json({ ok: false, error: `type tidak valid, pilih: ${TYPES.join(", ")}` })
        try {
            const { data } = await axios.get(`https://dns.google/resolve`, {
                params: { name: domain, type },
                timeout: 15000,
                headers: { "Accept": "application/dns-json", "User-Agent": "Mozilla/5.0" },
            })
            const answers = (data.Answer || []).map(a => ({ name: a.name, type: typeNumToStr(a.type), ttl: a.ttl, data: a.data }))
            res.json({ ok: true, domain, type, status: data.Status, answers })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}
const TYPE_MAP = { 1: "A", 2: "NS", 5: "CNAME", 6: "SOA", 12: "PTR", 15: "MX", 16: "TXT", 28: "AAAA", 33: "SRV", 257: "CAA" }
function typeNumToStr(n) { return TYPE_MAP[n] || `TYPE${n}` }

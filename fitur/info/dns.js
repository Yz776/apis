// /info/dns — DNS lookup via DNS-over-HTTPS with multi-resolver fallback.
// Tries Google → AliDNS → Quad9 → Cloudflare in order, because some ISPs/routers
// poison or block individual DoH hosts (e.g. dns.google NXDOMAINs on certain CPEs).
import axios from "axios"

const TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "PTR", "CAA", "SRV"]

const RESOLVERS = [
  { url: "https://dns.google/resolve", accept: "application/dns-json" },
  { url: "https://dns.alidns.com/resolve", accept: "application/dns-json" },
  { url: "https://dns.quad9.net:5053/dns-query", accept: "application/dns-json" },
  { url: "https://cloudflare-dns.com/dns-query", accept: "application/dns-json" },
]

export default {
    route: {
        method: "get",
        path: "/info/dns",
        auth: false,
        tags: ["Info"],
        summary: "DNS lookup",
        description: "Cari DNS record sebuah domain via DNS-over-HTTPS dengan fallback multi-resolver (Google, AliDNS, Quad9, Cloudflare). Mendukung A, AAAA, CNAME, MX, NS, TXT, SOA, dll.",
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
 let lastErr = null
 for (const r of RESOLVERS) {
 try {
 const { data } = await axios.get(r.url, {
 params: { name: domain, type },
 timeout: 8000,
 headers: { "Accept": r.accept, "User-Agent": "Mozilla/5.0" },
 })
 const answers = (data.Answer || []).map(a => ({ name: a.name, type: typeNumToStr(a.type), ttl: a.ttl, data: a.data }))
 return res.json({ ok: true, domain, type, resolver: new URL(r.url).hostname, status: data.Status, answers })
 } catch (e) { lastErr = e }
 }
 throw lastErr || new Error("semua resolver DoH tidak dapat dijangkau")
 } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}
const TYPE_MAP = { 1: "A", 2: "NS", 5: "CNAME", 6: "SOA", 12: "PTR", 15: "MX", 16: "TXT", 28: "AAAA", 33: "SRV", 257: "CAA" }
function typeNumToStr(n) { return TYPE_MAP[n] || `TYPE${n}` }

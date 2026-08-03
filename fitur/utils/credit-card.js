// /utils/credit-card — Credit card number generator (test, Luhn-valid) & validator
const ISSUERS = [
    { name: "visa", prefixes: ["4"], length: 16 },
    { name: "mastercard", prefixes: ["51", "52", "53", "54", "55"], length: 16 },
    { name: "amex", prefixes: ["34", "37"], length: 15 },
    { name: "discover", prefixes: ["6011"], length: 16 },
]

function luhnCheck(num) {
    let sum = 0, dbl = false
    for (let i = num.length - 1; i >= 0; i--) {
        let d = parseInt(num[i], 10)
        if (dbl) { d *= 2; if (d > 9) d -= 9 }
        sum += d
        dbl = !dbl
    }
    return sum % 10 === 0
}

function luhnComplete(num) {
    let sum = 0, dbl = true
    for (let i = num.length - 1; i >= 0; i--) {
        let d = parseInt(num[i], 10)
        if (dbl) { d *= 2; if (d > 9) d -= 9 }
        sum += d
        dbl = !dbl
    }
    return (10 - sum % 10) % 10
}

function generate(issuerName) {
    const issuer = ISSUERS.find(i => i.name === issuerName) || ISSUERS[0]
    let num = issuer.prefixes[Math.floor(Math.random() * issuer.prefixes.length)]
    while (num.length < issuer.length - 1) num += Math.floor(Math.random() * 10)
    return num + luhnComplete(num)
}

function detectIssuer(num) {
    for (const i of ISSUERS) {
        if (i.prefixes.some(p => num.startsWith(p))) return i.name
    }
    return "unknown"
}

export default {
    route: {
        method: "get",
        path: "/utils/credit-card",
        auth: false,
        tags: ["Utils"],
        summary: "Credit card number generator (test) & validator",
        description: "Generate nomor kartu kredit TEST (Luhn-valid, BUKAN kartu asli) atau validasi nomor kartu.",
        parameters: [
            { name: "number", in: "query", required: false, description: "Nomor kartu untuk divalidasi (jika kosong, generate baru)", schema: { type: "string" } },
            { name: "issuer", in: "query", required: false, description: "Issuer: visa/mastercard/amex/discover (default visa)", schema: { type: "string", enum: ["visa", "mastercard", "amex", "discover"], default: "visa" } },
            { name: "count", in: "query", required: false, description: "Jumlah nomor yang di-generate (default 1, max 50)", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "Hasil generate/validasi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        if (req.query.number) {
            const num = String(req.query.number).replace(/\D/g, "")
            const valid = num.length >= 13 && num.length <= 19 && luhnCheck(num)
            return res.json({ ok: true, number: num, valid, issuer: detectIssuer(num) })
        }
        const issuer = String(req.query.issuer || "visa").toLowerCase()
        let count = parseInt(req.query.count, 10) || 1
        if (count < 1) count = 1
        if (count > 50) count = 50
        const cards = []
        for (let i = 0; i < count; i++) cards.push(generate(issuer))
        res.json({ ok: true, count: cards.length, issuer, numbers: cards, note: "TEST numbers only — not real credit cards" })
    },
}

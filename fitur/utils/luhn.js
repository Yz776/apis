// /utils/luhn — Luhn algorithm (credit card validator)
function luhnValid(num) {
    const digits = String(num).replace(/\D/g, "")
    if (digits.length < 13 || digits.length > 19) return false
    let sum = 0, alt = false
    for (let i = digits.length - 1; i >= 0; i--) {
        let d = parseInt(digits[i], 10)
        if (alt) { d *= 2; if (d > 9) d -= 9 }
        sum += d
        alt = !alt
    }
    return sum % 10 === 0
}
function cardType(num) {
    const n = String(num).replace(/\D/g, "")
    if (/^4/.test(n)) return "Visa"
    if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "Mastercard"
    if (/^3[47]/.test(n)) return "American Express"
    if (/^6(?:011|5)/.test(n)) return "Discover"
    if (/^(?:352[89]|35[3-8])/.test(n)) return "JCB"
    if (/^3(?:0[0-5]|[68])/.test(n)) return "Diners Club"
    return "Unknown"
}

export default {
    route: {
        method: "get",
        path: "/utils/luhn",
        auth: false,
        tags: ["Utils"],
        summary: "Luhn check (credit card validator)",
        description: "Validasi nomor kartu kredit dengan algoritma Luhn dan deteksi jenis kartu (Visa, Mastercard, dll). Tidak menyimpan nomor.",
        parameters: [
            { name: "number", in: "query", required: true, description: "Nomor kartu (digit 13-19)", schema: { type: "string", example: "4111111111111111" } },
        ],
        responses: { "200": { description: "Hasil validasi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const n = String(req.query.number || "").trim()
        if (!n) return res.status(400).json({ ok: false, error: "number wajib diisi" })
        const digits = n.replace(/\D/g, "")
        if (!digits) return res.status(400).json({ ok: false, error: "number harus berisi digit" })
        const valid = luhnValid(digits)
        res.json({ ok: true, number_masked: "****" + digits.slice(-4), length: digits.length, valid, type: valid ? cardType(digits) : "Invalid" })
    },
}

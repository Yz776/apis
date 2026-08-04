// /utils/imei — IMEI generator & validator (Luhn-valid)
import crypto from "crypto"

function luhnChecksum(num) {
    let sum = 0, dbl = false
    for (let i = num.length - 1; i >= 0; i--) {
        let d = parseInt(num[i], 10)
        if (dbl) { d *= 2; if (d > 9) d -= 9 }
        sum += d
        dbl = !dbl
    }
    return sum % 10
}

function generateImei() {
    // TAC prefixes (8 digit) — random from common range
    const prefixes = ["35123456", "35989100", "35480910", "35991100", "49015420"]
    const tac = prefixes[Math.floor(Math.random() * prefixes.length)]
    let num = tac
    for (let i = 0; i < 6; i++) num += Math.floor(Math.random() * 10)
    // calc Luhn check digit
    let sum = 0, dbl = true
    for (let i = num.length - 1; i >= 0; i--) {
        let d = parseInt(num[i], 10)
        if (dbl) { d *= 2; if (d > 9) d -= 9 }
        sum += d
        dbl = !dbl
    }
    const check = (10 - sum % 10) % 10
    return num + check
}

export default {
    route: {
        method: "get",
        path: "/utils/imei",
        auth: false,
        tags: ["Utils"],
        summary: "IMEI generator/validator (Luhn-valid)",
        description: "Generate IMEI acak (15 digit, Luhn-valid) atau validasi IMEI yang ada.",
        parameters: [
            { name: "imei", in: "query", required: false, description: "IMEI untuk divalidasi (jika kosong, generate baru)", schema: { type: "string", example: "490154203237518" } },
            { name: "count", in: "query", required: false, description: "Jumlah IMEI yang di-generate (default 1, max 100)", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "Hasil generate/validasi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        if (req.query.imei) {
            const imei = String(req.query.imei).replace(/\D/g, "")
            const valid = imei.length === 15 && luhnChecksum(imei) === 0
            return res.json({ ok: true, imei, valid })
        }
        let count = parseInt(req.query.count, 10) || 1
        if (count < 1) count = 1
        if (count > 100) count = 100
        const imeis = []
        for (let i = 0; i < count; i++) imeis.push(generateImei())
        res.json({ ok: true, count: imeis.length, imeis })
    },
}

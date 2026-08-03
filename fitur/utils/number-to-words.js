// /utils/number-to-words — number to English & Indonesian words
const ONES_EN = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
const TENS_EN = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
const SCALES_EN = ["", "thousand", "million", "billion", "trillion", "quadrillion"]

const ONES_ID = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh",
    "sebelas", "dua belas", "tiga belas", "empat belas", "lima belas", "enam belas", "tujuh belas", "delapan belas", "sembilan belas"]
const TENS_ID = ["", "", "dua puluh", "tiga puluh", "empat puluh", "lima puluh", "enam puluh", "tujuh puluh", "delapan puluh", "sembilan puluh"]

function below1000En(n) {
    if (n === 0) return ""
    let s = ""
    if (n >= 100) { s += ONES_EN[Math.floor(n / 100)] + " hundred"; n %= 100; if (n) s += " " }
    if (n >= 20) { s += TENS_EN[Math.floor(n / 10)]; if (n % 10) s += "-" + ONES_EN[n % 10] }
    else if (n > 0) s += ONES_EN[n]
    return s
}

function toEnglish(num) {
    if (num === 0) return "zero"
    if (num < 0) return "negative " + toEnglish(-num)
    let parts = []
    let scaleIdx = 0
    while (num > 0) {
        const chunk = num % 1000
        if (chunk) {
            const chunkWords = below1000En(chunk)
            parts.unshift(chunkWords + (SCALES_EN[scaleIdx] ? " " + SCALES_EN[scaleIdx] : ""))
        }
        num = Math.floor(num / 1000)
        scaleIdx++
    }
    return parts.join(" ")
}

function toIndonesian(num) {
    if (num === 0) return "nol"
    if (num < 0) return "negatif " + toIndonesian(-num)
    if (num < 20) return ONES_ID[num]
    if (num < 100) {
        const t = Math.floor(num / 10)
        const r = num % 10
        return r === 0 ? TENS_ID[t] : TENS_ID[t] + " " + ONES_ID[r]
    }
    if (num < 200) {
        const r = num - 100
        return r === 0 ? "seratus" : "seratus " + toIndonesian(r)
    }
    if (num < 1000) {
        const h = Math.floor(num / 100)
        const r = num % 100
        return r === 0 ? ONES_ID[h] + " ratus" : ONES_ID[h] + " ratus " + toIndonesian(r)
    }
    if (num < 2000) {
        const r = num - 1000
        return r === 0 ? "seribu" : "seribu " + toIndonesian(r)
    }
    if (num < 1000000) {
        const t = Math.floor(num / 1000)
        const r = num % 1000
        return r === 0 ? toIndonesian(t) + " ribu" : toIndonesian(t) + " ribu " + toIndonesian(r)
    }
    if (num < 1000000000) {
        const m = Math.floor(num / 1000000)
        const r = num % 1000000
        return r === 0 ? toIndonesian(m) + " juta" : toIndonesian(m) + " juta " + toIndonesian(r)
    }
    if (num < 1000000000000) {
        const b = Math.floor(num / 1000000000)
        const r = num % 1000000000
        return r === 0 ? toIndonesian(b) + " miliar" : toIndonesian(b) + " miliar " + toIndonesian(r)
    }
    return "terlalu besar"
}

export default {
    route: {
        method: "get",
        path: "/utils/number-to-words",
        auth: false,
        tags: ["Utils"],
        summary: "Number to words (EN/ID)",
        description: "Konversi angka menjadi kata-kata dalam bahasa Inggris atau Indonesia. Mendukung hingga triliunan.",
        parameters: [
            { name: "number", in: "query", required: true, description: "Angka", schema: { type: "integer", example: 12345 } },
            { name: "lang", in: "query", required: false, description: "Bahasa: en atau id (default en)", schema: { type: "string", enum: ["en", "id"], default: "en" } },
        ],
        responses: { "200": { description: "Angka dalam kata" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const num = parseInt(req.query.number, 10)
        if (isNaN(num)) return res.status(400).json({ ok: false, error: "number wajib angka bulat" })
        if (Math.abs(num) > 1e15) return res.status(400).json({ ok: false, error: "number terlalu besar (max 1e15)" })
        const lang = String(req.query.lang || "en").toLowerCase()
        const words = lang === "id" ? toIndonesian(num) : toEnglish(num)
        res.json({ ok: true, number: num, lang, words })
    },
}

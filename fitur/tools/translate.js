import axios from "axios"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
const ENDPOINT = "https://translate.googleapis.com/translate_a/single"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Fallback endpoints — Google operates multiple Translate endpoints, switch if one rate-limits.
const ENDPOINTS = [
    "https://translate.googleapis.com/translate_a/single",
    "https://clients5.google.com/translate_a/t",
    "https://translate.google.com/translate_a/single",
]

// MyMemory translation API (free, no key) — used when all Google endpoints are rate-limited.
// Limit: 5000 chars/day anonymous, ~50k with email param.
async function translateMyMemory(text, from, to) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(from === "auto" ? "en" : from)}|${encodeURIComponent(to)}`
    const { data, status } = await axios.get(url, {
        headers: { "user-agent": UA, "accept": "application/json" },
        timeout: 15000,
        validateStatus: () => true,
    })
    if (status !== 200) throw new Error(`MyMemory error: HTTP ${status}`)
    const translated = data?.responseData?.translatedText || ""
    if (!translated || translated.includes("MYMEMORY WARNING")) {
        throw new Error("MyMemory: " + (data?.responseStatus || "unknown error"))
    }
    const detected = data?.responseData?.detectedLanguage || from
    return { translated, detected }
}

// Terjemah via endpoint gratis Google (tanpa API key / package tambahan).
// from "auto" = deteksi otomatis. Mengembalikan teks + bahasa sumber terdeteksi.
// Auto-retry 3x dengan backoff + rotate endpoints saat kena 429 (rate-limited).
// Final fallback: MyMemory API jika semua Google endpoints rate-limited.
export async function translate(text, from = "auto", to = "id") {
    let lastErr = null
    for (let attempt = 0; attempt < 3; attempt++) {
        const endpoint = ENDPOINTS[attempt % ENDPOINTS.length]
        const url = `${endpoint}?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(text)}`
        try {
            const { data, status } = await axios.get(url, {
                headers: { "user-agent": UA, "accept": "application/json,text/plain,*/*" },
                timeout: 15000,
                validateStatus: () => true,
            })
            if (status === 429 || status === 503) {
                lastErr = new Error(`Google Translate rate-limited (HTTP ${status})`)
                await sleep(800 * (attempt + 1))
                continue
            }
            if (status !== 200) {
                lastErr = new Error(`Google Translate error: HTTP ${status}`)
                continue
            }
            // data: [ [[segTerjemah, segAsli, ...], ...], null, detectedLang, ... ]
            const translated = (data?.[0] || []).map(seg => seg?.[0]).filter(Boolean).join("")
            if (translated) {
                return { translated, detected: data?.[2] || from }
            }
        } catch (e) {
            lastErr = e
            await sleep(500 * (attempt + 1))
        }
    }

    // Final fallback: MyMemory API when Google is fully rate-limited
    try {
        const result = await translateMyMemory(text, from, to)
        return { ...result, source: "mymemory-fallback" }
    } catch (e) {
        const msg = lastErr?.message || e.message
        if (msg.includes("429") || msg.includes("rate-limited")) {
            throw new Error("Google Translate & MyMemory sedang rate-limited (HTTP 429). Coba lagi dalam beberapa menit. Endpoint alternatif: /tools/translate atau gunakan /ai/qwen untuk parafase multi-bahasa.")
        }
        throw lastErr || new Error(`Translate gagal — Google error: ${msg}, MyMemory error: ${e.message}`)
    }
}

export default {
    route: {
        method: "get",
        path: "/tools/translate",
        auth: false,
        tags: ["Tools"],
        summary: "Translate teks (Google Translate)",
        description: "Menerjemahkan teks menggunakan Google Translate. from='auto' untuk deteksi otomatis. Kode bahasa contoh: id, en, ja, ko, ar, zh-cn. Tanpa API key.",
        parameters: [
            {
                name: "text",
                in: "query",
                required: true,
                description: "Teks yang ingin diterjemahkan",
                schema: { type: "string", example: "Selamat pagi, apa kabar?" },
            },
            {
                name: "to",
                in: "query",
                required: false,
                description: "Kode bahasa tujuan (default id)",
                schema: { type: "string", default: "id", example: "ja" },
            },
            {
                name: "from",
                in: "query",
                required: false,
                description: "Kode bahasa sumber, 'auto' untuk deteksi otomatis (default auto)",
                schema: { type: "string", default: "auto", example: "id" },
            },
        ],
        responses: {
            "200": {
                description: "Berhasil",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean", example: true },
                                from: { type: "string", description: "Bahasa sumber (terdeteksi bila auto)" },
                                to: { type: "string" },
                                text: { type: "string", description: "Teks asli" },
                                result: { type: "string", description: "Teks hasil terjemahan" },
                            },
                        },
                    },
                },
            },
            "400": { description: "Parameter tidak valid" },
            "500": { description: "Kesalahan server" },
        },
    },

    handler: async (req, res) => {
        const text = (req.query.text || "").toString()
        if (!text.trim()) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const to = (req.query.to || "id").toString().trim()
        const from = (req.query.from || "auto").toString().trim()
        try {
            const { translated, detected } = await translate(text, from, to)
            res.json({ ok: true, from: detected, to, text, result: translated })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

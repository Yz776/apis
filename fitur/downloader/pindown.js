import { createDecipheriv, createHash } from "crypto"
import axios from "axios"
import * as cheerio from "cheerio"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
const BASE = "https://pindown.io"

// pindown.io (2026-09) melindungi /action dengan challenge proof-of-work:
//   POST /api/token -> { id, p } di mana p adalah challenge terenkripsi AES-256-CBC.
//   Kunci = SHA-256(seedParts.join("") + ":" + id), IV = 16 byte pertama payload.
//   Header X-Verify = id:jawaban:expiry:hash. Tanpa ini semua request ditolak 403.
function solveChallenge(c) {
    if (!c || typeof c !== "object" || !Number.isInteger(c._e) || typeof c._h !== "string") {
        throw new Error("Challenge pindown tidak valid")
    }
    const operand = (value, min = 0, max = 1023) => {
        if (!Number.isInteger(value) || value < min || value > max) throw new Error("Challenge pindown tidak valid")
        return value
    }
    switch (c.t) {
        case "r":
            if (!Array.isArray(c.n) || c.n.length < 1) throw new Error("Challenge pindown tidak valid")
            return c.n.reduce((sum, n) => sum + operand(n), 0) * 2 + 1
        case "b":
            return ((operand(c.a) ^ operand(c.b)) >> operand(c.shift, 0, 7)) & 255
        case "c":
            return c.word.charCodeAt(operand(c.index, 0, c.word.length - 1)) * operand(c.multiplier, 1, 9)
        case "m":
            return ((operand(c.a) + operand(c.b)) % 100) * operand(c.multiplier, 1, 9)
        case "n": {
            const a = operand(c.a), b = operand(c.b), cc = operand(c.c)
            return a * b + b * cc + cc * a - a
        }
        default:
            throw new Error(`Tipe challenge pindown tidak dikenal: ${c.t}`)
    }
}

function decryptChallenge(id, encryptedPayload, seed) {
    const bytes = Buffer.from(encryptedPayload, "base64")
    const key = createHash("sha256").update(`${seed}:${id}`).digest()
    const decipher = createDecipheriv("aes-256-cbc", key, bytes.subarray(0, 16))
    const plaintext = Buffer.concat([decipher.update(bytes.subarray(16)), decipher.final()])
    return JSON.parse(plaintext.toString("utf8"))
}

async function verifyHeader(url, seed, lang, cookies) {
    // /api/token men-set cookie session_data yang mengikat challenge ke sesi ini.
    // Cookie itu wajib dikirim ulang ke /action, kalau tidak verifikasi ditolak.
    const tokenRes = await axios.post(`${BASE}/api/token`, { url }, {
        headers: {
            "user-agent": UA,
            "content-type": "application/json",
            accept: "application/json",
            "x-requested-with": "XMLHttpRequest",
            "x-form-language": lang,
            ...(cookies && { cookie: cookies }),
        },
        timeout: 20000,
    })
    const data = tokenRes.data
    if (!data?.id || !data?.p) throw new Error("Gagal mengambil challenge pindown")
    const sessionCookie = (tokenRes.headers["set-cookie"] || []).map(c => c.split(";")[0]).join("; ")
    const challenge = decryptChallenge(data.id, data.p, seed)
    return {
        verify: `${data.id}:${solveChallenge(challenge)}:${challenge._e}:${challenge._h}`,
        cookie: [cookies, sessionCookie].filter(Boolean).join("; "),
    }
}

// Sebagian link unduhan dibungkus JWT (dl.pincdn.app/v2?token=...) yang memuat url pinimg langsung.
function decodeToken(downloadUrl) {
    try {
        const token = new URL(downloadUrl).searchParams.get("token")
        if (!token) return {}
        const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString())
        return {
            directUrl: payload.url ? decodeURIComponent(payload.url) : null,
            filename: payload.filename || null,
            expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
        }
    } catch {
        return {}
    }
}

async function pindown(pinUrl) {
    const home = await axios.get(`${BASE}/en1`, { headers: { "user-agent": UA, accept: "text/html" }, timeout: 20000 })
    const cookies = (home.headers["set-cookie"] || []).map(c => c.split(";")[0]).join("; ")
    const $home = cheerio.load(home.data)

    const config = JSON.parse($home("[data-challenge-config]").attr("value") || "{}")
    const seed = (config.seedParts || []).join("")
    if (!seed) throw new Error("Konfigurasi challenge pindown tidak ditemukan")

    const hidden = {}
    $home("form[name='formurl'] input[type='hidden']").each((_, el) => {
        const name = $home(el).attr("name")
        if (name && name !== "data-challenge-config") hidden[name] = $home(el).attr("value") || ""
    })
    const lang = hidden.lang || "en"

    const { verify, cookie } = await verifyHeader(pinUrl, seed, lang, cookies)

    const body = new URLSearchParams({ url: pinUrl, ...hidden, lang })
    const { data: j } = await axios.post(`${BASE}/action`, body.toString(), {
        headers: {
            "user-agent": UA,
            accept: "application/json",
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "x-requested-with": "XMLHttpRequest",
            "x-verify": verify,
            origin: BASE,
            referer: `${BASE}/en1`,
            cookie,
        },
        timeout: 30000,
        validateStatus: () => true,
    })
    if (!j || j.error || !j.html) {
        const errMsg = j?.message || ""
        if (/private|unavailable/i.test(errMsg)) {
            throw new Error("Pin Pinterest private atau tidak tersedia. Coba pin publik.")
        }
        throw new Error(errMsg || "Media tidak ditemukan. Pastikan URL Pinterest valid dan pin publik.")
    }

    const $ = cheerio.load(j.html)
    const title = $("strong").first().text().trim() || null
    const thumbnail = $(".media-left img, .media .image img").first().attr("src") || null

    const medias = []
    const seen = new Set()
    $("table tbody tr").each((_, tr) => {
        const quality = $(tr).find(".video-quality").first().text().trim()
        const downloadUrl = ($(tr).find("a[href]").first().attr("href") || "").replace(/&amp;/g, "&")
        if (!downloadUrl || seen.has(downloadUrl)) return
        seen.add(downloadUrl)
        const meta = decodeToken(downloadUrl)
        medias.push({
            quality: quality || null,
            downloadUrl,
            directUrl: meta.directUrl || null,
            filename: meta.filename || null,
            expiresAt: meta.expiresAt || null,
        })
    })

    if (!medias.length) throw new Error("Tidak ada media yang ditemukan")
    return { title, thumbnail, total: medias.length, medias }
}

export default {
    route: {
        method: "get",
        path: "/downloader/pindown",
        auth: false,
        tags: ["Downloader"],
        summary: "Download Pinterest via pindown",
        description: "Mengunduh video/GIF/gambar Pinterest menggunakan pindown.io. Mendukung link pinterest.com maupun pin.it.",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL Pinterest (pin.it atau pinterest.com)",
                schema: { type: "string", example: "https://pin.it/uWysLLKpr" },
            },
        ],
        responses: {
            "200": { description: "Berhasil" },
            "400": { description: "URL tidak valid" },
            "500": { description: "Kesalahan server" },
        },
    },

    handler: async (req, res) => {
        const { url } = req.query
        if (!url || !/^https?:\/\//i.test(url)) {
            return res.status(400).json({ ok: false, error: "URL tidak valid" })
        }
        try {
            // Challenge proof-of-work kadang ditolak di percobaan pertama (race di sisi upstream).
            let lastErr
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const result = await pindown(url)
                    return res.json({ ok: true, result })
                } catch (e) {
                    lastErr = e
                    if (attempt < 2) await new Promise(r => setTimeout(r, 600))
                }
            }
            throw lastErr
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

// School search & detail via Dapodik (Dapo Kemendikdasmen)
// Adapted from HaidarMahiru/snippet-vault snippets/haidar/sdsekolah.js
// Upstream: https://dapo.kemendikdasmen.go.id (auto-scraped VITE_API_TOKEN from env.js)

import axios from "axios"

const BASE = "https://dapo.kemendikdasmen.go.id"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

let cachedToken = null
let cachedApiUrl = BASE
let tokenExpiry = 0
const TTL = 30 * 60_000 // 30 minutes

async function fetchConfig() {
    if (cachedToken && Date.now() < tokenExpiry) {
        return { token: cachedToken, apiUrl: cachedApiUrl }
    }
    const { data } = await axios.get(`${BASE}/env.js`, {
        headers: { "User-Agent": UA },
        timeout: 15000,
    })
    const urlMatch = data.match(/VITE_STRAPI_URL\s*:\s*"(.*?)"/)
    const tokenMatch = data.match(/VITE_API_TOKEN\s*:\s*"(.*?)"/)
    if (urlMatch) cachedApiUrl = urlMatch[1].replace(/\/$/, "")
    if (tokenMatch) {
        cachedToken = tokenMatch[1]
        tokenExpiry = Date.now() + TTL
    }
    if (!cachedToken) {
        throw new Error("Gagal mengurai VITE_API_TOKEN dari dapo.kemendikdasmen.go.id/env.js")
    }
    return { token: cachedToken, apiUrl: cachedApiUrl }
}

async function fetchJson(path) {
    const { token, apiUrl } = await fetchConfig()
    // NOTE: Dapodik API rejects requests with "Accept: application/json" header.
    // Only Authorization + User-Agent should be sent.
    const { data, status } = await axios.get(`${apiUrl}${path}`, {
        headers: {
            "Authorization": `Bearer ${token}`,
            "User-Agent": UA,
        },
        timeout: 15000,
        validateStatus: () => true,
    })
    if (status === 400) throw new Error("Pencarian gagal: kata kunci minimal 4 karakter.")
    if (status === 429) throw new Error("Rate limit Dapodik. Coba lagi nanti.")
    if (status < 200 || status >= 300) {
        throw new Error(`Dapodik API gagal (HTTP ${status})`)
    }
    return data
}

async function searchSchools(query) {
    const q = String(query).trim()
    if (q.length < 4) {
        throw new Error("Kata kunci pencarian minimal 4 karakter")
    }
    const result = await fetchJson(`/api/detail-sekolah/search?q=${encodeURIComponent(q)}`)
    if (Array.isArray(result)) return result
    if (Array.isArray(result?.data)) return result.data
    return []
}

async function getSchoolDetail(npsn) {
    const n = String(npsn).trim()
    if (!n) throw new Error("NPSN wajib diisi")
    return await fetchJson(`/api/detail-sekolah?npsn=${encodeURIComponent(n)}`)
}

export default {
    route: {
        method: "get",
        path: "/tools/sekolah",
        auth: false,
        tags: ["Tools"],
        summary: "Cari/detail sekolah via Dapodik",
        description: "Mencari sekolah di database Dapodik (Dapo Kemendikdasmen) berdasarkan nama, atau mengambil detail lengkap sekolah berdasarkan NPSN.",
        parameters: [
            {
                name: "type",
                in: "query",
                required: true,
                description: "Jenis aksi: `search` (cari sekolah) atau `detail` (detail sekolah berdasarkan NPSN).",
                schema: { type: "string", enum: ["search", "detail"], example: "search" },
            },
            {
                name: "query",
                in: "query",
                required: false,
                description: "Kata kunci pencarian nama sekolah (min 4 karakter). Wajib jika type=search.",
                schema: { type: "string", example: "SMKN 1 Jakarta" },
            },
            {
                name: "npsn",
                in: "query",
                required: false,
                description: "Nomor NPSN sekolah. Wajib jika type=detail.",
                schema: { type: "string", example: "20100123" },
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
                                result: {
                                    type: "object",
                                    properties: {
                                        type: { type: "string" },
                                        count: { type: "integer" },
                                        schools: {
                                            type: "array",
                                            items: { type: "object" },
                                        },
                                        detail: { type: "object", nullable: true },
                                    },
                                },
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
        const { type, query, npsn } = req.query
        if (!type || !["search", "detail"].includes(type)) {
            return res.status(400).json({ ok: false, error: "type harus `search` atau `detail`" })
        }
        try {
            if (type === "search") {
                if (!query) return res.status(400).json({ ok: false, error: "query wajib diisi untuk type=search" })
                const schools = await searchSchools(query)
                return res.json({
                    ok: true,
                    result: { type: "search", count: schools.length, schools },
                })
            } else {
                if (!npsn) return res.status(400).json({ ok: false, error: "npsn wajib diisi untuk type=detail" })
                const detail = await getSchoolDetail(npsn)
                return res.json({
                    ok: true,
                    result: { type: "detail", detail: detail?.data || detail },
                })
            }
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

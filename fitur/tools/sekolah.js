// School search & detail via Dapodik (Dapo Kemendikdasmen)
// Adapted from HaidarMahiru/snippet-vault snippets/haidar/sdsekolah.js
// Upstream: https://dapo.kemendikdasmen.go.id (auto-scraped VITE_API_TOKEN from env.js)
//
// Dapodik sits behind a SafeLine WAF that TLS-fingerprints clients, and its
// verdict has flipped over time: at one point only curl passed, later the WAF
// started returning 403 to curl while Bun's native fetch was accepted. So we
// try Bun fetch first and fall back to curl if fetch is refused (or vice versa
// implicitly via whichever returns 200).

import { execFile } from "node:child_process"
import { promisify } from "node:util"
const execFileAsync = promisify(execFile)

const BASE = "https://dapo.kemendikdasmen.go.id"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

let cachedToken = null
let cachedApiUrl = BASE
let tokenExpiry = 0
const TTL = 30 * 60_000 // 30 minutes

// Fetch a URL via Bun's native fetch; returns { status, body }.
async function nativeGet(url, extraHeaders = {}) {
  const r = await fetch(url, {
    headers: { "user-agent": UA, ...extraHeaders },
    signal: AbortSignal.timeout(25000),
    redirect: "follow",
  })
  return { status: r.status, body: await r.text() }
}

// Legacy curl path — kept as fallback in case the WAF starts refusing Bun's TLS fingerprint again.
async function curlGet(url, extraHeaders = {}) {
 const args = ["-sS", "--max-time", "20", "-w", "\n__HTTP_STATUS__:%{http_code}", url,
 "-H", `User-Agent: ${UA}`]
 for (const [k, v] of Object.entries(extraHeaders)) {
 args.push("-H", `${k}: ${v}`)
 }
 const { stdout } = await execFileAsync("curl", args, { maxBuffer: 5 * 1024 * 1024 })
 // Split body and trailing status marker
 const markerIdx = stdout.lastIndexOf("\n__HTTP_STATUS__:")
 if (markerIdx === -1) {
 throw new Error("curl tidak return status marker")
 }
 const body = stdout.slice(0, markerIdx)
 const statusLine = stdout.slice(markerIdx).trim()
 const status = parseInt(statusLine.split(":")[1], 10)
 return { status, body }
}

// Try Bun fetch, then curl; prefer whichever returns a 2xx JSON-able response.
async function httpGet(url, extraHeaders = {}) {
  let firstErr = null
  try {
    const r = await nativeGet(url, extraHeaders)
    if (r.status >= 200 && r.status < 400) return r
    firstErr = new Error(`HTTP ${r.status}`)
  } catch (e) { firstErr = e }
  try {
    return await curlGet(url, extraHeaders)
  } catch (e) {
    throw firstErr || e
  }
}

async function fetchConfig() {
 if (cachedToken && Date.now() < tokenExpiry) {
 return { token: cachedToken, apiUrl: cachedApiUrl }
 }
 const { status, body } = await httpGet(`${BASE}/env.js`)
 if (status !== 200) {
 throw new Error(`Gagal fetch env.js (HTTP ${status})`)
 }
    const urlMatch = body.match(/VITE_STRAPI_URL\s*:\s*"(.*?)"/)
    const tokenMatch = body.match(/VITE_API_TOKEN\s*:\s*"(.*?)"/)
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
 const { status, body } = await httpGet(`${apiUrl}${path}`, {
 "Authorization": `Bearer ${token}`,
 "Accept": "application/json",
 })
    if (status === 400) throw new Error("Pencarian gagal: kata kunci minimal 4 karakter.")
    if (status === 429) throw new Error("Rate limit Dapodik. Coba lagi nanti.")
    if (status < 200 || status >= 300) {
        throw new Error(`Dapodik API gagal (HTTP ${status})`)
    }
    try {
        return JSON.parse(body)
    } catch (e) {
        throw new Error(`Response Dapodik bukan JSON valid: ${e.message}`)
    }
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
        description: "Mencari sekolah di database Dapodik (Dapo Kemendikdasmen) berdasarkan nama, atau mengambil detail lengkap sekolah berdasarkan NPSN. Catatan: implementasi memakai curl via child_process karena Dapodik punya SafeLine WAF yang melakukan TLS fingerprinting (axios & Bun fetch ditolak, curl diterima).",
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

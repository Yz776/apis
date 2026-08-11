import axios from "axios"

const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36"
const GOPAY = "https://gopay.co.id/games/v1/order/prepare"
const UNLOCKFF_URL = "https://unlockffbeta.com"
const NHENTAI_PROXY = "https://nhentai-proxy-v2.teknikisi255.workers.dev"

// ── Gopay method: cek nickname FF via Gopay prepare-order ──
async function verifyGopay(id) {
    const { data } = await axios.get(`${GOPAY}/FREEFIRE`, {
        params: { userId: id },
        headers: { "User-Agent": UA, "Accept": "application/json" },
        timeout: 12000,
        validateStatus: () => true
    })
    const name = data?.data
    if (data?.message !== "Success" || !name) return null
    // tolak echo: data === userId (false positive)
    if (name === String(id)) return null
    return String(name)
}

// ── UnlockFF Beta method: verifikasi via unlockffbeta.com ──
// ============================================================
// Reverse-engineered endpoints (2026-08-11 via Playwright + proxy):
//
//   POST /pageads/id    → inisialisasi sesi iklan (encrypted body)
//   POST /resume        → resume/load sesi existing (encrypted body)
//   POST /init/{id}     → verifikasi FF Account ID (encrypted body)
//
// Flow lengkap:
//   1. GET /               → load halaman + Cloudflare cookies
//   2. POST /pageads/id    → init ad session → response: encrypted session token
//   3. POST /resume        → load existing session → response: encrypted session data
//   4. POST /init/{id}     → verify account → response: encrypted verification result
//
// Catatan:
//   - Semua POST body ter-encrypt (CryptoJS AES) — key berasal dari
//     window.__nkq7 (berubah per versi/page load).
//   - Cloudflare geo-block: SG/HK/TW di-block (403 + "Service Notice").
//   - Butuh proxy di region yang di-allow (Indonesia, dll) untuk bypass.
//   - Cloudflare challenge platform juga aktif di /init/ endpoint.
// ============================================================
async function verifyUnlockFF(id) {
    try {
        const session = axios.create({
            headers: {
                "User-Agent": UA,
                "Accept": "application/json, text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Referer": UNLOCKFF_URL,
                "Origin": UNLOCKFF_URL,
            },
            timeout: 20000,
            validateStatus: () => true,
            maxRedirects: 5
        })

        // Step 1: GET homepage untuk init Cloudflare cookies
        const homeResp = await session.get(UNLOCKFF_URL)
        if (homeResp.status === 403 || (typeof homeResp.data === "string" && homeResp.data.includes("Service Notice"))) {
            return { status: "geo_blocked", message: "unlockffbeta.com: IP di region yang di-block (SG/HK/TW). Butuh proxy dari region lain." }
        }

        // Step 2: POST /pageads/id — init ad session
        const pageadsResp = await session.post(`${UNLOCKFF_URL}/pageads/id`, "", {
            headers: { "Content-Type": "text/plain" }
        })

        // Step 3: POST /resume — load existing session
        const resumeResp = await session.post(`${UNLOCKFF_URL}/resume`, "", {
            headers: { "Content-Type": "text/plain" }
        })

        // Step 4: POST /init/{id} — verify FF Account ID
        // Body ter-encrypt, tapi kita kirim kosong dulu untuk test response format
        const initResp = await session.post(`${UNLOCKFF_URL}/init/${id}`, "", {
            headers: { "Content-Type": "text/plain" }
        })

        // Cloudflare challenge (403 with "Just a moment...")
        if (initResp.status === 403 && typeof initResp.data === "string" && initResp.data.includes("Just a moment")) {
            return {
                status: "cf_challenge",
                message: "unlockffbeta.com: Cloudflare challenge aktif di /init/ endpoint. Butuh browser automation (Playwright/Puppeteer) untuk solve challenge.",
                endpoints_discovered: {
                    init: `POST /init/${id}`,
                    pageads: "POST /pageads/id",
                    resume: "POST /resume"
                }
            }
        }

        // Sukses response
        if (initResp.status === 200 && initResp.data) {
            // Response ter-encrypt, tapi kita return raw-nya
            return {
                status: "success",
                endpoint: `POST /init/${id}`,
                raw: typeof initResp.data === "string" ? initResp.data.substring(0, 200) : initResp.data,
                note: "Response ter-encrypt (CryptoJS AES). Key dari window.__nkq7 di client-side JS.",
                endpoints_discovered: {
                    init: `POST /init/${id}`,
                    pageads: "POST /pageads/id",
                    resume: "POST /resume"
                }
            }
        }

        // Status lain
        return {
            status: "unexpected",
            httpStatus: initResp.status,
            message: `unlockffbeta.com /init/${id} return status ${initResp.status}`,
            endpoints_discovered: {
                init: `POST /init/${id}`,
                pageads: "POST /pageads/id",
                resume: "POST /resume"
            }
        }

    } catch (e) {
        return { status: "error", message: e.message }
    }
}

// ── Cek nickname FF via isan fallback ──
async function verifyIsan(id) {
    try {
        const { data } = await axios.get("https://ff-api.isan.eu.org/api", {
            params: { id },
            headers: { "User-Agent": UA, "Accept": "application/json" },
            timeout: 15000,
            validateStatus: () => true
        })
        if (data?.name || data?.nickname || data?.data?.name) {
            return data?.name || data?.nickname || data?.data?.name
        }
        return null
    } catch {
        return null
    }
}

function notFound(msg) {
    const err = new Error(msg)
    err.status = 404
    return err
}
function badRequest(msg) {
    const err = new Error(msg)
    err.status = 400
    return err
}

export default {
    route: {
        method: "get",
        path: "/search/ff-verify",
        auth: false,
        tags: ["Search"],
        summary: "Verifikasi ID akun Free Fire (multi-sumber: Gopay, UnlockFF Beta, isan)",
        description: "Verifikasi akun Free Fire berdasarkan User ID. Multi-source: (1) Gopay (utama, paling stabil), (2) unlockffbeta.com (Astutech Beta Server — reverse-engineered endpoints: POST /pageads/id, POST /resume, POST /init/{id}. Body ter-encrypt CryptoJS AES, key dari window.__nkq7. Cloudflare geo-block + challenge aktif), (3) isan.eu.org (fallback).",
        parameters: [
            {
                name: "id",
                in: "query",
                required: true,
                description: "User ID akun Free Fire",
                schema: { type: "string", example: "5425742577" }
            },
            {
                name: "source",
                in: "query",
                required: false,
                description: "Sumber verifikasi: all (default, cek semua), gopay (hanya Gopay), unlockff (unlockffbeta.com + nhentai proxy), isan (hanya isan fallback)",
                schema: { type: "string", enum: ["all", "gopay", "unlockff", "isan"], example: "all" }
            }
        ],
        responses: {
            "200": {
                description: "Berhasil verifikasi",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean", example: true },
                                result: {
                                    type: "object",
                                    properties: {
                                        userId: { type: "string", example: "5425742577" },
                                        game: { type: "string", example: "Garena Free Fire" },
                                        nickname: { type: "string", example: "kipas lewat" },
                                        verified: { type: "boolean", example: true },
                                        sources: {
                                            type: "object",
                                            properties: {
                                                gopay: { type: "object" },
                                                unlockff: { type: "object" },
                                                isan: { type: "object" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "400": {
                description: "Parameter tidak valid",
                content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } }
            },
            "404": {
                description: "Akun tidak ditemukan",
                content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } }
            },
            "500": {
                description: "Kesalahan server",
                content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } }
            }
        }
    },

    handler: async (req, res) => {
        const { id, source = "all" } = req.query

        if (!id?.trim()) {
            return res.status(400).json({ ok: false, error: "Isi parameter 'id' (User ID Free Fire)" })
        }

        const validSources = ["all", "gopay", "unlockff", "isan"]
        if (!validSources.includes(source.toLowerCase())) {
            return res.status(400).json({ ok: false, error: `Source tidak valid. Pilihan: ${validSources.join(", ")}` })
        }

        const src = source.toLowerCase()
        const sources = {}
        let nickname = null
        let verified = false

        // ── Gopay verification ──
        if (src === "all" || src === "gopay") {
            try {
                const name = await verifyGopay(id.trim())
                sources.gopay = name
                    ? { status: "success", nickname: name }
                    : { status: "not_found" }
                if (name) { nickname = name; verified = true }
            } catch (e) {
                sources.gopay = { status: "error", message: e.message }
            }
        }

        // ── UnlockFF Beta verification ──
        if (src === "all" || src === "unlockff") {
            try {
                const result = await verifyUnlockFF(id.trim())
                sources.unlockff = result
                // Jika unlockff berhasil dan punya nickname, gunakan itu
                if (result.status === "success" && result.data) {
                    const unlockName = result.data?.nickname || result.data?.name || result.data?.data?.name
                    if (unlockName && !nickname) { nickname = unlockName; verified = true }
                }
            } catch (e) {
                sources.unlockff = { status: "error", message: e.message }
            }
        }

        // ── Isan fallback verification ──
        if (src === "all" || src === "isan") {
            try {
                const name = await verifyIsan(id.trim())
                sources.isan = name
                    ? { status: "success", nickname: name }
                    : { status: "not_found" }
                if (name && !nickname) { nickname = name; verified = true }
            } catch (e) {
                sources.isan = { status: "error", message: e.message }
            }
        }

        // Jika tidak ada sumber yang berhasil menemukan akun
        if (!verified && !nickname) {
            return res.status(404).json({
                ok: false,
                error: "Akun Free Fire tidak ditemukan di semua sumber, cek kembali User ID",
                sources
            })
        }

        return res.json({
            ok: true,
            result: {
                game: "Garena Free Fire",
                userId: String(id.trim()),
                nickname,
                verified,
                sources
            }
        })
    }
}

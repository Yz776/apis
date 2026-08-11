import axios from "axios"

const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36"
const GOPAY = "https://gopay.co.id/games/v1/order/prepare"
const UNLOCKFF_URL = "https://unlockffbeta.com"

// ── Gopay method: cek nickname FF via Gopay prepare-order ──
// Paling cepat (0.1s) dan stabil (100% success rate).
async function verifyGopay(id) {
    const { data } = await axios.get(`${GOPAY}/FREEFIRE`, {
        params: { userId: id },
        headers: { "User-Agent": UA, "Accept": "application/json" },
        timeout: 12000,
        validateStatus: () => true
    })
    const name = data?.data
    if (data?.message !== "Success" || !name) return null
    // tolak echo: data === userId (false positive dari Gopay)
    if (name === String(id)) return null
    return String(name)
}

// ── UnlockFF Beta: verifikasi via unlockffbeta.com ──
// ============================================================
// Reverse-engineered endpoints (2026-08-11):
//   POST /pageads/id  → init ad session (encrypted)
//   POST /resume      → resume session (encrypted)
//   POST /init/{id}   → verify FF Account ID (encrypted)
//
// Karena body ter-encrypt (CryptoJS AES) dan Cloudflare geo-block
// aktif, kita butuh proxy di region yang di-allow (ID, dll).
// User bisa set proxy via parameter ?proxy=http://...
//
// Jika proxy disediakan, kita pakai axios dengan proxy.
// Jika tidak, kita coba langsung (akan fail di region blocked).
// ============================================================
async function verifyUnlockFF(id, proxyUrl) {
    try {
        const axiosConfig = {
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
        }

        // Set proxy jika disediakan
        if (proxyUrl) {
            try {
                const proxyUrlObj = new URL(proxyUrl)
                axiosConfig.proxy = {
                    host: proxyUrlObj.hostname,
                    port: parseInt(proxyUrlObj.port) || 80,
                    protocol: proxyUrlObj.protocol.replace(":", "")
                }
            } catch { /* invalid proxy URL, ignore */ }
        }

        const session = axios.create(axiosConfig)

        // Step 1: GET homepage untuk init Cloudflare cookies
        const homeResp = await session.get(UNLOCKFF_URL)

        // Cek geo-block
        if (homeResp.status === 403 || (typeof homeResp.data === "string" && homeResp.data.includes("Service Notice"))) {
            return {
                status: "geo_blocked",
                message: "unlockffbeta.com: IP di-block oleh Cloudflare (region SG/HK/TW). Gunakan parameter ?proxy=http://IP:PORT dengan proxy dari Indonesia/region yang di-allow.",
                endpoints: ["/pageads/id", "/resume", "/init/{id}"]
            }
        }

        // Step 2: POST /pageads/id — init ad session
        await session.post(`${UNLOCKFF_URL}/pageads/id`, "", {
            headers: { "Content-Type": "text/plain" }
        })

        // Step 3: POST /resume — load existing session
        await session.post(`${UNLOCKFF_URL}/resume`, "", {
            headers: { "Content-Type": "text/plain" }
        })

        // Step 4: POST /init/{id} — verify FF Account ID
        const initResp = await session.post(`${UNLOCKFF_URL}/init/${id}`, "", {
            headers: { "Content-Type": "text/plain" }
        })

        // Cloudflare challenge
        if (initResp.status === 403 && typeof initResp.data === "string" && initResp.data.includes("Just a moment")) {
            return {
                status: "cf_challenge",
                message: "Cloudflare challenge aktif. Butuh browser automation (Playwright/Puppeteer) atau Cloudflare bypass.",
                endpoints: ["/pageads/id", "/resume", `/init/${id}`]
            }
        }

        // Sukses
        if (initResp.status === 200 && initResp.data) {
            return {
                status: "success",
                endpoint: `POST /init/${id}`,
                raw: typeof initResp.data === "string" ? initResp.data.substring(0, 300) : initResp.data,
                note: "Response ter-encrypt (CryptoJS AES). Key = window.__nkq7. Decrypt di client-side untuk mendapat nickname.",
                endpoints: ["/pageads/id", "/resume", `/init/${id}`]
            }
        }

        return {
            status: "error",
            httpStatus: initResp.status,
            message: `unlockffbeta.com /init/${id} return status ${initResp.status}`,
            endpoints: ["/pageads/id", "/resume", `/init/${id}`]
        }

    } catch (e) {
        return { status: "error", message: e.message }
    }
}

export default {
    route: {
        method: "get",
        path: "/search/ff-verify",
        auth: false,
        tags: ["Search"],
        summary: "Verifikasi ID akun Free Fire (Gopay + UnlockFF Beta)",
        description: "Verifikasi akun Free Fire berdasarkan User ID. Sumber utama: Gopay (cepat 0.1s, stabil 100%). Sumber tambahan: unlockffbeta.com (reverse-engineered: POST /init/{id}, body ter-encrypt CryptoJS AES). Jika akses unlockffbeta di-block oleh Cloudflare, gunakan parameter proxy.",
        parameters: [
            {
                name: "id",
                in: "query",
                required: true,
                description: "User ID akun Free Fire",
                schema: { type: "string", example: "1000695760" }
            },
            {
                name: "source",
                in: "query",
                required: false,
                description: "Sumber verifikasi: all (default), gopay (hanya Gopay), unlockff (hanya unlockffbeta.com)",
                schema: { type: "string", enum: ["all", "gopay", "unlockff"], example: "all" }
            },
            {
                name: "proxy",
                in: "query",
                required: false,
                description: "HTTP proxy untuk akses unlockffbeta.com (contoh: http://176.100.37.91:30379). Diperlukan jika server di region yang di-Cloudflare block.",
                schema: { type: "string", example: "http://176.100.37.91:30379" }
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
                                        userId: { type: "string", example: "1000695760" },
                                        game: { type: "string", example: "Garena Free Fire" },
                                        nickname: { type: "string", example: "Calichi1243J" },
                                        verified: { type: "boolean", example: true },
                                        sources: {
                                            type: "object",
                                            properties: {
                                                gopay: { type: "object" },
                                                unlockff: { type: "object" }
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
        const { id, source = "all", proxy } = req.query

        if (!id?.trim()) {
            return res.status(400).json({ ok: false, error: "Isi parameter 'id' (User ID Free Fire). Contoh: ?id=1000695760" })
        }

        const validSources = ["all", "gopay", "unlockff"]
        if (!validSources.includes(source.toLowerCase())) {
            return res.status(400).json({ ok: false, error: `Source tidak valid. Pilihan: ${validSources.join(", ")}` })
        }

        const src = source.toLowerCase()
        const sources = {}
        let nickname = null
        let verified = false

        // ── Gopay verification (PRIMARY — cepat & stabil) ──
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
                const result = await verifyUnlockFF(id.trim(), proxy || null)
                sources.unlockff = result
                // Jika unlockff berhasil dan punya nickname, gunakan itu
                if (result.status === "success" && result.raw) {
                    // Response ter-encrypt, tapi kalau bisa parse sebagai JSON:
                    try {
                        const parsed = typeof result.raw === "string" ? JSON.parse(result.raw) : result.raw
                        const unlockName = parsed?.nickname || parsed?.name || parsed?.data?.name
                        if (unlockName && !nickname) { nickname = unlockName; verified = true }
                    } catch { /* encrypted, can't parse without key */ }
                }
            } catch (e) {
                sources.unlockff = { status: "error", message: e.message }
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

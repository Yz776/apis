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
// unlockffbeta.com adalah layanan verifikasi akun FF (Astutech Beta Server).
// Flow: user submit Account ID → server verify → return status + info.
// Karena unlockffbeta.com dilindungi Cloudflare (geo-block & challenge),
// kita coba akses via POST ke endpoint internal-nya.
// Jika Cloudflare block, return status "cloudflare_blocked" agar caller tahu.
async function verifyUnlockFF(id) {
    try {
        const session = axios.create({
            headers: {
                "User-Agent": UA,
                "Accept": "application/json, text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
            timeout: 15000,
            validateStatus: () => true,
            maxRedirects: 5
        })

        // Coba beberapa kemungkinan endpoint (unlockffbeta & nhentai proxy)
        const endpoints = [
            // UnlockFF Beta langsung
            { url: `${UNLOCKFF_URL}/api/verify`, method: "post", payload: { id, userId: id, accountId: id } },
            { url: `${UNLOCKFF_URL}/api/v1/verify`, method: "post", payload: { id, userId: id } },
            { url: `${UNLOCKFF_URL}/api/check`, method: "post", payload: { accountId: id } },
            { url: `${UNLOCKFF_URL}/verify`, method: "post", payload: { id, userId: id } },
            // Via nhentai-proxy-v2.teknikisi255.workers.dev sebagai proxy
            { url: `${NHENTAI_PROXY}/api/verify`, method: "post", payload: { id, userId: id, accountId: id } },
            { url: `${NHENTAI_PROXY}/verify`, method: "post", payload: { id, userId: id } },
        ]

        for (const ep of endpoints) {
            try {
                const resp = await session({
                    method: ep.method,
                    url: ep.url,
                    data: ep.payload,
                    headers: { "Content-Type": "application/json" }
                })

                // Cloudflare challenge / block / bad url
                if (resp.status === 403 || resp.status === 503) continue
                if (typeof resp.data === "string" && (resp.data.includes("cf-challenge") || resp.data === "bad url")) continue

                // Sukses dapat response
                if (resp.status === 200 && resp.data && typeof resp.data === "object") {
                    return {
                        status: "success",
                        endpoint: ep.url,
                        data: resp.data
                    }
                }
            } catch { /* try next endpoint */ }
        }

        // Semua endpoint blocked/gagal
        return { status: "cloudflare_blocked", message: "unlockffbeta.com & proxy dilindungi Cloudflare. Tidak bisa diakses dari server ini." }

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
        description: "Verifikasi akun Free Fire berdasarkan User ID. Mengecek nickname dan status akun dari beberapa sumber: (1) Gopay (utama), (2) unlockffbeta.com + nhentai-proxy-v2.teknikisi255.workers.dev (via Cloudflare Worker proxy), (3) isan.eu.org (fallback). Source unlockffbeta.com mungkin blocked oleh Cloudflare dari beberapa region.",
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

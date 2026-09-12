// ============================================================================
// Alight Motion Premium — Account Status Check
// ----------------------------------------------------------------------------
// Pasangan dari /tools/alight-motion dan /tools/alight-motion/refresh.
// Memeriksa status akun & premium Alight Motion via Firebase getAccountInfo.
//
//   GET  /tools/alight-motion/status?idToken=<idToken>
//   POST /tools/alight-motion/status    { "idToken": "..." }
//
// Backend memakai Firebase Identity Toolkit getAccountInfo untuk:
//   1. Memvalidasi idToken (jika invalid/expired → 401)
//   2. Mengambil metadata akun (email, emailVerified, createdAt, lastLoginAt)
//   3. Mencoba mendeteksi status premium dari:
//        - customAttributes (Firebase Custom Claims)
//        - providerUserInfo
//        - photoUrl / displayName perubahan post-premium
//
// Catatan: Alight Motion menyimpan status premium di sisi server aplikasi
// (Cloud Firestore / Realtime DB), bukan di Firebase Auth custom claims.
// Oleh karena itu, field `premium` di response di-set dari heuristik:
//   - Jika `customAttributes` punya flag premium/pro → true
//   - Jika `providerUserInfo` mengandung entri alightcreative → true
//   - Selain itu → null (tidak diketahui), bukan false
// Untuk verifikasi premium yang definitif, gunakan /tools/alight-motion
// (Tahap 2) yang langsung memanggil verifyPurchase Cloud Function.
// ============================================================================

import axios from "axios"
import crypto from "crypto"

// ─── Config (sama dengan fitur/tools/alight-motion.js) ──────────────────────
const cfg = {
    key: "AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0",
    idt: "https://www.googleapis.com/identitytoolkit/v3/relyingparty",
}

// Random IPv4 — dipakai untuk spoof header IP upstream
const dip = () =>
    [
        crypto.randomInt(1, 255),
        crypto.randomInt(0, 255),
        crypto.randomInt(0, 255),
        crypto.randomInt(1, 255),
    ].join(".")

const sp = (h) => ({
    ...h,
    "x-forwarded-for": dip(),
    "x-real-ip": dip(),
    "client-ip": dip(),
    "x-client-ip": dip(),
    "x-originating-ip": dip(),
    "x-cluster-client-ip": dip(),
})

const h1 = {
    "content-type": "application/json",
    "x-android-package": "com.alightcreative.motion",
    "x-android-cert": "ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8",
    "user-agent":
        "dalvik/2.1.0 (linux; u; android 15; 23127pn0cc build/bp1a.250505.005)",
}

const bad = (e) => {
    const d = e.response?.data
    if (!d) return e.message
    if (typeof d === "object") {
        // Firebase sering pakai { error: { message: "INVALID_ID_TOKEN", code: 400 } }
        return d.error?.message || JSON.stringify(d)
    }
    return String(d)
}

// ─── Heuristik deteksi premium dari data akun ───────────────────────────────
// Kembalikan objek { premium, sources } — sources adalah alasan/field yang
// memicu keputusan premium.
function detectPremium(user) {
    const sources = []

    if (!user || typeof user !== "object") {
        return { premium: null, sources }
    }

    // 1) customAttributes (string JSON biasanya)
    const customAttrsRaw = user.customAttributes
    if (customAttrsRaw) {
        try {
            const parsed =
                typeof customAttrsRaw === "string"
                    ? JSON.parse(customAttrsRaw)
                    : customAttrsRaw
            // berbagai kemungkinan key
            const checks = [
                "premium",
                "isPremium",
                "pro",
                "isPro",
                "subscription",
                "subscribed",
                "am_premium",
                "alight_premium",
            ]
            for (const k of checks) {
                if (parsed[k] === true || parsed[k] === 1) {
                    sources.push(`customAttributes.${k}=true`)
                }
            }
            // nested subscription object
            if (parsed.subscription && typeof parsed.subscription === "object") {
                if (parsed.subscription.active === true || parsed.subscription.status === "active") {
                    sources.push("customAttributes.subscription.active")
                }
            }
        } catch {
            // customAttributes bukan JSON valid — skip
        }
    }

    // 2) providerUserInfo — cari entri alightcreative / playgames
    const providers = Array.isArray(user.providerUserInfo)
        ? user.providerUserInfo
        : []
    for (const p of providers) {
        const pid = String(p?.providerId || p?.provider_id || "").toLowerCase()
        if (pid.includes("alight")) {
            sources.push(`providerUserInfo:${pid}`)
        }
        if (pid === "playgames.google.com" || pid === "google.com") {
            // Tidak otomatis premium, tapi catat untuk info
            // (jangan dimasukkan ke sources supaya tidak false positive)
        }
    }

    // 3) custom claims kadang muncul sebagai field terpisah
    if (user.premium === true || user.isPremium === true) {
        sources.push("user.premium=true")
    }

    const premium = sources.length > 0 ? true : null

    return { premium, sources }
}

// ─── Panggil getAccountInfo ──────────────────────────────────────────────────
async function getAccountInfo(idToken) {
    try {
        const r = await axios.post(
            `${cfg.idt}/getAccountInfo?key=${cfg.key}`,
            { idToken },
            { headers: sp(h1) }
        )
        const user = r.data?.users?.[0] || null
        if (!user) {
            return {
                ok: false,
                error: "Akun tidak ditemukan untuk idToken ini",
            }
        }
        return { ok: true, user, raw: r.data }
    } catch (e) {
        return { ok: false, error: bad(e) }
    }
}

// ============================================================================
// Route definition — auto-discovered by index.js
// ============================================================================
export default {
    route: {
        method: "get",
        path: "/tools/alight-motion/status",
        auth: false,
        noCache: true, // status akun bisa berubah — jangan cache
        tags: ["Tools"],
        summary:
            "Alight Motion — cek status akun & indikator premium via getAccountInfo",
        description:
            "Mengambil info akun Firebase Auth dari `idToken` dan menjalankan heuristik untuk mendeteksi apakah akun sudah premium.\n\n" +
            "**Contoh (GET):**\n" +
            "```\nGET /tools/alight-motion/status?idToken=eyJhbGc...\n```\n\n" +
            "**Contoh (POST — direkomendasikan agar idToken tidak muncul di URL):**\n" +
            "```\nPOST /tools/alight-motion/status\nContent-Type: application/json\n\n{ \"idToken\": \"eyJhbGc...\" }\n```\n\n" +
            "**Response:**\n" +
            "```\n{\n  \"ok\": true,\n  \"premium\": true | null,\n  \"premiumSources\": [\"customAttributes.premium=true\"],\n  \"user\": {\n    \"localId\": \"...\",\n    \"email\": \"...\",\n    \"emailVerified\": true,\n    \"createdAt\": \"...\",\n    \"lastLoginAt\": \"...\"\n  }\n}\n```\n\n" +
            "Catatan penting:\n" +
            "- `premium: true` → heuristic mendeteksi tanda premium di customAttributes / providerUserInfo.\n" +
            "- `premium: null` → heuristic tidak menemukan tanda, **bukan berarti belum premium**. Alight Motion menyimpan status premium di Firestore, bukan di Firebase Auth.\n" +
            "- Untuk verifikasi definitif, gunakan `/tools/alight-motion` (Tahap 2) yang memanggil Cloud Function `verifyPurchase`.\n" +
            "- Jika `idToken` expired → response 401, gunakan `/tools/alight-motion/refresh` untuk memperpanjang.",
        parameters: [
            {
                name: "idToken",
                in: "query",
                required: true,
                description:
                    "Firebase idToken (Bearer token) dari /tools/alight-motion Tahap 2 atau dari /tools/alight-motion/refresh. Untuk keamanan lebih baik, kirim via POST body.",
                schema: { type: "string" },
            },
        ],
        responses: {
            "200": {
                description: "OK — info akun berhasil diambil",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean", example: true },
                                premium: {
                                    type: ["boolean", "null"],
                                    description:
                                        "true jika heuristic mendeteksi premium. null jika tidak terdeteksi (belum tentu belum premium — lihat catatan).",
                                },
                                premiumSources: {
                                    type: "array",
                                    items: { type: "string" },
                                    description:
                                        "Daftar field/alasan yang memicu premium=true",
                                },
                                user: {
                                    type: "object",
                                    properties: {
                                        localId: { type: "string" },
                                        email: { type: "string" },
                                        emailVerified: { type: "boolean" },
                                        displayName: { type: "string" },
                                        photoUrl: { type: "string" },
                                        createdAt: { type: "string" },
                                        lastLoginAt: { type: "string" },
                                        providerUserInfo: { type: "array" },
                                        customAttributes: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            "400": {
                description: "Parameter idToken tidak diisi",
            },
            "401": {
                description:
                    "idToken invalid/expired — gunakan /tools/alight-motion/refresh untuk memperpanjang",
            },
            "500": { description: "Gagal memanggil Firebase" },
            "504": { description: "Timeout — upstream lambat" },
        },
    },

    // ─── Handler ─────────────────────────────────────────────────────────────
    handler: async (req, res) => {
        // Endpoint ini menerima idToken lewat query (GET) atau body (POST).
        // index.js menggabungkan keduanya di req.query (lihat adapt() di index.js:
        // `const mergedQuery = { ...c.query, ...body }`).
        const idToken = String(req.query.idToken || "").trim()

        if (!idToken) {
            return res.status(400).json({
                ok: false,
                error:
                    "Parameter 'idToken' wajib diisi. Dapat via query (GET) atau body (POST).",
            })
        }

        // Validasi minimal: JWT format = header.payload.signature (3 segmen)
        const segs = idToken.split(".")
        if (segs.length < 2 || idToken.length < 50) {
            return res.status(400).json({
                ok: false,
                error:
                    "Format idToken tidak valid. Pastikan nilai yang dikirim adalah Firebase JWT idToken yang lengkap.",
            })
        }

        try {
            const result = await getAccountInfo(idToken)
            if (!result.ok) {
                // Pesan error Firebase biasanya: INVALID_ID_TOKEN, TOKEN_EXPIRED, USER_DISABLED, etc.
                const err = String(result.error)
                const isAuthError = /invalid|expired|user.*disabled|credential/i.test(
                    err
                )
                const code = isAuthError ? 401 : 500
                return res.status(code).json({
                    ok: false,
                    error: result.error,
                    hint: isAuthError
                        ? "idToken invalid/expired. Panggil /tools/alight-motion/refresh?refreshToken=<token> untuk mendapatkan idToken baru."
                        : undefined,
                })
            }

            const user = result.user
            const { premium, sources } = detectPremium(user)

            // Saring field sensitif yang tidak perlu di-expose ke klien
            const safeUser = {
                localId: user.localId || null,
                email: user.email || null,
                emailVerified: !!user.emailVerified,
                displayName: user.displayName || null,
                photoUrl: user.photoUrl || null,
                createdAt: user.createdAt || null,
                lastLoginAt: user.lastLoginAt || null,
                lastRefreshAt: user.lastRefreshAt || null,
                providerUserInfo: Array.isArray(user.providerUserInfo)
                    ? user.providerUserInfo.map((p) => ({
                          providerId: p.providerId || p.provider_id,
                          federatedId: p.federatedId || p.federated_id,
                          displayName: p.displayName || p.display_name,
                          email: p.email,
                          rawId: p.rawId || p.raw_id,
                      }))
                    : [],
                customAttributes: user.customAttributes || "",
            }

            return res.json({
                ok: true,
                premium,
                premiumSources: sources,
                user: safeUser,
                note: premium === null
                    ? "Heuristik tidak menemukan tanda premium di Firebase Auth — Alight Motion menyimpan status premium di Firestore. Untuk verifikasi definitif, gunakan endpoint /tools/alight-motion (Tahap 2)."
                    : undefined,
            })
        } catch (e) {
            return res.status(500).json({
                ok: false,
                error: e?.message || String(e),
            })
        }
    },
}

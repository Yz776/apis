// ============================================================================
// Alight Motion Premium — REST API endpoint
// ----------------------------------------------------------------------------
// Source: snippet.js (WhatsApp bot plugin, ESM)
// Adapted into the Kangwifi APIs auto-discovery format.
//
// Mendukung CUSTOM ORDER ID:
//   - Jika parameter `orderId` diisi → dipakai apa adanya.
//   - Jika tidak diisi → auto-generate `neo-<random hex>` (perilaku asli).
//
// Two flow stages:
//   1. Kirim link verifikasi ke email        → ?email=user@example.com
//   2. Verifikasi link + apply premium       → ?email=...&link=<oob_link>[&orderId=...]
// ============================================================================

import axios from "axios"
import crypto from "crypto"

// ─── Config ─────────────────────────────────────────────────────────────────
const cfg = {
    key: "AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0",
    idt: "https://www.googleapis.com/identitytoolkit/v3/relyingparty",
    stk: "https://securetoken.googleapis.com/v1/token",
    vfy: "https://us-central1-alight-creative.cloudfunctions.net/verifyPurchase",
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
        "dalvik/2.0.0 (linux; u; android 15; 23127pn0cc build/bp1a.250505.005)",
}

const h2 = {
    "content-type": "application/json; charset=utf-8",
    "user-agent": "okhttp/3.12.1",
    "accept-encoding": "gzip",
}

const bad = (e) => {
    const d = e.response?.data
    return d ? (typeof d === "object" ? JSON.stringify(d) : String(d)) : e.message
}

// ─── Stage 1: send verification email link ─────────────────────────────────
async function sendLink(email) {
    const c1 = { identifier: email, continueUri: "http://localhost" }
    const c2 = {
        requestType: 6,
        email: email,
        androidInstallApp: true,
        canHandleCodeInApp: true,
        continueUrl: "https://alightcreative.com?ui_sid=0366624874&ui_sd=0",
        iosBundleId: "com.alightcreative.motion",
        androidPackageName: "com.alightcreative.motion",
        androidMinimumVersion: "585",
        clientType: "CLIENT_TYPE_ANDROID",
    }
    try {
        await axios.post(
            `${cfg.idt}/createAuthUri?key=${cfg.key}`,
            c1,
            { headers: sp(h1) }
        )
        const r = await axios.post(
            `${cfg.idt}/getOobConfirmationCode?key=${cfg.key}`,
            c2,
            { headers: sp(h1) }
        )
        return { ok: true, result: r.data }
    } catch (e) {
        return { ok: false, error: bad(e) }
    }
}

// ─── Extract oobCode from a URL / raw string ────────────────────────────────
function extractCode(raw) {
    if (!raw) return null
    let s = String(raw).replace(/&/g, "&")
    try {
        s = decodeURIComponent(s)
    } catch {}
    try {
        const u = new URL(s)
        let c = u.searchParams.get("oobCode")
        if (!c) {
            const n =
                u.searchParams.get("link") ||
                u.searchParams.get("q") ||
                u.searchParams.get("url")
            if (n) {
                try {
                    c = new URL(n).searchParams.get("oobCode")
                } catch {}
            }
        }
        if (c) return c.replace(/[^a-zA-Z0-9_-]/g, "")
    } catch {}
    const m = s.match(/oobCode=([a-zA-Z0-9_-]+)/i)
    if (m) return m[1]
    const t = raw.trim()
    if (/^[a-zA-Z0-9_-]{10,}$/.test(t) && !t.includes("://")) return t
    return null
}

// ─── Stage 2a: verify email link & retrieve tokens ──────────────────────────
async function verifyAuth(email, raw) {
    const c = extractCode(raw)
    if (!c) return { ok: false, error: "Code oobCode tidak ditemukan pada link" }
    try {
        const a = await axios.post(
            `${cfg.idt}/emailLinkSignin?key=${cfg.key}`,
            {
                email: email,
                oobCode: c,
                clientType: "CLIENT_TYPE_ANDROID",
            },
            { headers: sp(h1) }
        )
        let user = null
        try {
            const b = await axios.post(
                `${cfg.idt}/getAccountInfo?key=${cfg.key}`,
                { idToken: a.data.idToken },
                { headers: sp(h1) }
            )
            user = b.data?.users?.[0] || null
        } catch {}
        return {
            ok: true,
            email,
            idToken: a.data.idToken,
            refreshToken: a.data.refreshToken,
            localId: a.data.localId,
            isNewUser: !!a.data.isNewUser,
            user,
        }
    } catch (e) {
        return { ok: false, error: bad(e) }
    }
}

// ─── Stage 2b: apply premium — NOW SUPPORTS CUSTOM ORDER ID ──────────────────
// `customOrderId` opsional:
//   - string non-kosong → dipakai apa adanya
//   - undefined / kosong → auto-generate `neo-<12-char hex>` (perilaku asli)
async function applyPremium(idToken, customOrderId) {
    // ⚙️ Custom order ID logic
    let orderId
    let orderSource
    if (customOrderId && String(customOrderId).trim()) {
        // Bersihkan supaya aman dipakai di JSON — buang spasi & karakter kontrol
        orderId = String(customOrderId).trim().replace(/[\x00-\x1F\x7F]/g, "")
        orderSource = "custom"
    } else {
        orderId = "neo-" + crypto.randomBytes(6).toString("hex")
        orderSource = "auto"
    }

    const body = {
        data: {
            productId: "am.full.sub.annual.19q4",
            token: "mmgaobamlahbbeccfplmbkbb.AO-J1OzqG0or_GJJIx-ms8GrTm-jaglCRfhQSRPUZKpl2YspYS-oN7_94uv8RC5vQbvd_Ios2pPDStZ2n7F0hLE3FiOU7HS3R6Fquulv5xLXFECSv4ctElw",
            skuType: "subs",
            orderId: orderId,
        },
    }

    const headers = {
        ...h2,
        authorization: "Bearer " + idToken,
        "firebase-instance-id-token":
            "cSDnCyp3T-uwp07z3tL86T:APA91bFkmvvsHw5nnqa1SBFci-99DRsKClLiETdRrVcJjS5yBx1v_FbCb1d8WhBuea_zmwnYBktyTIzcRhN4b6uNOUur9wPc0gKXmJDoZic0LhNq5V2s0xI",
    }

    try {
        const r = await axios.post(cfg.vfy, body, { headers: sp(headers) })
        return {
            ok: true,
            orderId,
            orderSource, // "custom" | "auto"
            result: r.data,
        }
    } catch (e) {
        return { ok: false, orderId, orderSource, error: bad(e) }
    }
}

// ─── Refresh token helper (opsional, untuk prolong session) ──────────────────
async function refreshIdToken(refreshToken) {
    try {
        const r = await axios.post(`${cfg.stk}?key=${cfg.key}`, {
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        })
        return {
            ok: true,
            idToken: r.data.id_token,
            refreshToken: r.data.refresh_token,
        }
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
        path: "/tools/alight-motion",
        auth: false,
        noCache: true,
        tags: ["Tools"],
        summary:
            "Alight Motion Premium — kirim link verifikasi & apply premium (custom order ID didukung)",
        description:
            "Dua tahap alur premium Alight Motion melalui email-link Firebase:\n\n" +
            "**Tahap 1 — Kirim link verifikasi:**\n" +
            "```\nGET /tools/alight-motion?email=user@example.com\n```\n\n" +
            "**Tahap 2 — Verifikasi & apply premium** (custom order ID opsional):\n" +
            "```\nGET /tools/alight-motion?email=user@example.com&link=<link_verifikasi>&orderId=my-order-001\n```\n\n" +
            "Jika `orderId` tidak diisi, akan di-generate otomatis (`neo-<random hex>`).\n" +
            "Jika diisi, nilai tersebut dipakai apa adanya sebagai `orderId` pada payload `verifyPurchase`.\n\n" +
            "Setelah Tahap 2 berhasil, response berisi `auth.refreshToken`. Gunakan token tersebut di:\n" +
            "```\nGET /tools/alight-motion/refresh?refreshToken=<refreshToken>\n```\n" +
            "untuk memperpanjang sesi tanpa perlu verifikasi email ulang.\n\n" +
            "Catatan: endpoint ini melakukan request ke upstream Google/Firebase & Alight Motion — rate-limit upstream berlaku.",
        parameters: [
            {
                name: "email",
                in: "query",
                required: true,
                description:
                    "Alamat email akun Alight Motion yang akan dipromosikan",
                schema: { type: "string", example: "user@example.com" },
            },
            {
                name: "link",
                in: "query",
                required: false,
                description:
                    "Link verifikasi email (oobCode) yang dikirim ke inbox. " +
                    "Kosongkan untuk Tahap 1 (kirim link). Isi untuk Tahap 2 (verify & apply premium).",
                schema: { type: "string" },
            },
            {
                name: "orderId",
                in: "query",
                required: false,
                description:
                    "🎯 CUSTOM ORDER ID — opsional. Jika diisi, dipakai apa adanya sebagai `orderId` pada payload verifyPurchase. " +
                    "Jika kosong, akan di-generate otomatis dengan format `neo-<12 hex>`.",
                schema: { type: "string", example: "my-custom-order-001" },
            },
        ],
        responses: {
            "200": {
                description: "OK",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean" },
                                stage: {
                                    type: "string",
                                    enum: ["send_link", "verify_premium"],
                                },
                                email: { type: "string" },
                                orderId: {
                                    type: "string",
                                    description:
                                        "Order ID yang dipakai (custom atau auto)",
                                },
                                orderSource: {
                                    type: "string",
                                    enum: ["custom", "auto"],
                                },
                                result: { type: "object" },
                            },
                        },
                    },
                },
            },
            "400": { description: "Parameter tidak valid" },
            "500": { description: "Gagal memproses (upstream error)" },
            "504": { description: "Timeout — upstream lambat" },
        },
    },

    // ─── Handler ─────────────────────────────────────────────────────────────
    handler: async (req, res) => {
        const email = String(req.query.email || "").trim()
        const link = req.query.link ? String(req.query.link).trim() : ""
        const orderIdRaw = req.query.orderId
            ? String(req.query.orderId).trim()
            : ""

        // 1) Email wajib
        if (!email || !email.includes("@")) {
            return res.status(400).json({
                ok: false,
                error:
                    "Parameter 'email' wajib diisi dengan alamat email yang valid.",
            })
        }

        // 2) Stage selection
        //    - Tanpa link      → kirim link verifikasi
        //    - Dengan link     → verify + apply premium (custom orderId opsional)
        try {
            if (!link) {
                // ── Stage 1: send verification email ────────────────────────
                const r = await sendLink(email)
                if (!r.ok) {
                    return res.status(500).json({
                        ok: false,
                        stage: "send_link",
                        email,
                        error: r.error,
                    })
                }
                return res.json({
                    ok: true,
                    stage: "send_link",
                    email,
                    message:
                        "Link verifikasi telah dikirim. Cek inbox/spam, lalu panggil endpoint lagi dengan parameter `link` dan (opsional) `orderId`.",
                    result: r.result,
                })
            }

            // ── Stage 2: verify link → apply premium ──────────────────────
            const auth = await verifyAuth(email, link)
            if (!auth.ok) {
                return res.status(500).json({
                    ok: false,
                    stage: "verify_auth",
                    email,
                    error: auth.error,
                })
            }

            // 🎯 Pass customOrderId (boleh kosong → applyPremium akan auto-generate)
            const pro = await applyPremium(auth.idToken, orderIdRaw)
            if (!pro.ok) {
                return res.status(500).json({
                    ok: false,
                    stage: "apply_premium",
                    email,
                    orderId: pro.orderId,
                    orderSource: pro.orderSource,
                    auth: {
                        uid: auth.localId,
                        isNewUser: auth.isNewUser,
                    },
                    error: pro.error,
                })
            }

            return res.json({
                ok: true,
                stage: "verify_premium",
                email,
                orderId: pro.orderId,
                orderSource: pro.orderSource, // "custom" | "auto"
                auth: {
                    uid: auth.localId,
                    isNewUser: auth.isNewUser,
                    refreshToken: auth.refreshToken,
                },
                result: pro.result,
            })
        } catch (e) {
            return res.status(500).json({
                ok: false,
                stage: "unexpected",
                email,
                error: e?.message || String(e),
            })
        }
    },
}

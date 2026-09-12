// ============================================================================
// Alight Motion Premium — Refresh Token endpoint
// ----------------------------------------------------------------------------
// Pasangan dari /tools/alight-motion. Setelah verify_premium berhasil,
// pemanggil mendapat `refreshToken` (lihat response field `auth.refreshToken`).
// Token tersebut bisa dipakai di endpoint ini untuk memperpanjang sesi:
//
//   GET /tools/alight-motion/refresh?refreshToken=<refresh_token>
//
// Firebase Identity Toolkit (securetoken.googleapis.com) akan menukar
// refresh token dengan idToken baru (umur ~1 jam). Refresh token baru juga
// dikembalikan (rotasi) — selalu simpan refreshToken terbaru.
//
// Catatan:
//   - Refresh token tidak kedaluwarsa kecuali di-revoke / user logout.
//   - Jika gagal dengan "INVALID_REFRESH_TOKEN", minta user verifikasi ulang
//     via /tools/alight-motion?email=...&link=...
// ============================================================================

import axios from "axios"

// ─── Config (sama dengan fitur/tools/alight-motion.js) ──────────────────────
const cfg = {
    key: "AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0",
    stk: "https://securetoken.googleapis.com/v1/token",
}

// ─── Refresh ID token via Firebase Secure Token API ──────────────────────────
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
            expires_in: r.data.expires_in,
            user_id: r.data.user_id,
            project_id: r.data.project_id,
            token_type: r.data.token_type,
        }
    } catch (e) {
        const d = e.response?.data
        const errMsg = d
            ? typeof d === "object"
                ? d.error?.message || JSON.stringify(d)
                : String(d)
            : e.message
        return { ok: false, error: errMsg }
    }
}

// ============================================================================
// Route definition — auto-discovered by index.js
// ============================================================================
export default {
    route: {
        method: "get",
        path: "/tools/alight-motion/refresh",
        auth: false,
        noCache: true,
        tags: ["Tools"],
        summary:
            "Alight Motion — refresh idToken via refreshToken (perpanjang sesi)",
        description:
            "Menukar `refreshToken` (dari /tools/alight-motion Tahap 2) dengan `idToken` baru. " +
            "Firebase idToken umurnya ~1 jam — panggil endpoint ini sebelum idToken kedaluwarsa untuk menjaga sesi tetap aktif.\n\n" +
            "**Contoh:**\n" +
            "```\nGET /tools/alight-motion/refresh?refreshToken=AMf-...\n```\n\n" +
            "**Response:**\n" +
            "```\n{\n  \"ok\": true,\n  \"idToken\": \"eyJhbGc...\",\n  \"refreshToken\": \"AMf-...\",\n  \"expires_in\": \"3600\"\n}\n```\n\n" +
            "Catatan: refresh token baru akan berbeda dari yang lama (rotasi). Simpan refreshToken baru untuk penggunaan berikutnya.",
        parameters: [
            {
                name: "refreshToken",
                in: "query",
                required: true,
                description:
                    "Refresh token yang didapat dari response /tools/alight-motion (field `auth.refreshToken`).",
                schema: {
                    type: "string",
                    example: "AMf-vBx...long-token-string...",
                },
            },
        ],
        responses: {
            "200": {
                description: "OK — token berhasil di-refresh",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean", example: true },
                                idToken: {
                                    type: "string",
                                    description:
                                        "JWT baru untuk otorisasi request berikutnya (umur ~1 jam)",
                                },
                                refreshToken: {
                                    type: "string",
                                    description:
                                        "Refresh token baru (rotasi). Simpan ini untuk refresh berikutnya.",
                                },
                                expires_in: {
                                    type: "string",
                                    description:
                                        "Umur idToken dalam detik (biasanya '3600')",
                                },
                                user_id: { type: "string" },
                                project_id: { type: "string" },
                                token_type: { type: "string" },
                            },
                        },
                    },
                },
            },
            "400": { description: "Parameter refreshToken tidak diisi" },
            "500": {
                description:
                    "Refresh gagal — refresh token invalid/expired/revoked",
            },
        },
    },

    // ─── Handler ─────────────────────────────────────────────────────────────
    handler: async (req, res) => {
        const refreshToken = String(req.query.refreshToken || "").trim()

        if (!refreshToken) {
            return res.status(400).json({
                ok: false,
                error:
                    "Parameter 'refreshToken' wajib diisi. Dapatkan nilai ini dari response /tools/alight-motion (field auth.refreshToken).",
            })
        }

        // Validasi minimal format refresh token Firebase (biasanya AMf-...)
        // Tidak ketat — Firebase yang akan validasi. Ini hanya filter awal.
        if (refreshToken.length < 20) {
            return res.status(400).json({
                ok: false,
                error:
                    "Format refreshToken tidak valid. Pastikan nilai yang dikirim adalah refresh token Firebase yang lengkap.",
            })
        }

        try {
            const result = await refreshIdToken(refreshToken)
            if (!result.ok) {
                // 400 = bad request dari Firebase (token invalid/expired)
                // 401 = unauthorized
                // Kita treat semua sebagai 500 (upstream error) kecuali kasus jelas
                const code = /invalid|expired|revoked/i.test(result.error)
                    ? 401
                    : 500
                return res.status(code).json({
                    ok: false,
                    error: result.error,
                    hint:
                        "Jika token sudah invalid/expired/revoked, minta user melakukan verifikasi ulang via /tools/alight-motion?email=...&link=...",
                })
            }

            return res.json({
                ok: true,
                idToken: result.idToken,
                refreshToken: result.refreshToken,
                expires_in: result.expires_in,
                user_id: result.user_id,
                project_id: result.project_id,
                token_type: result.token_type,
            })
        } catch (e) {
            return res.status(500).json({
                ok: false,
                error: e?.message || String(e),
            })
        }
    },
}

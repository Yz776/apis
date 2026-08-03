// /utils/jwt-decode — JWT decoder (without signature verification)
export default {
    route: {
        method: "get",
        path: "/utils/jwt-decode",
        auth: false,
        tags: ["Utils"],
        summary: "JWT decoder (no verification)",
        description: "Decode header dan payload JWT. TIDAK memverifikasi signature — hanya untuk inspeksi.",
        parameters: [
            { name: "token", in: "query", required: true, description: "JWT token", schema: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" } },
        ],
        responses: { "200": { description: "Hasil decode" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const token = String(req.query.token || "").trim()
        if (!token) return res.status(400).json({ ok: false, error: "token wajib diisi" })
        const parts = token.split(".")
        if (parts.length < 2) return res.status(400).json({ ok: false, error: "JWT harus memiliki minimal 2 segmen dipisahkan titik" })
        try {
            const b64decode = s => {
                const pad = s.length % 4 === 0 ? s : s + "=".repeat(4 - s.length % 4)
                return JSON.parse(Buffer.from(pad.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"))
            }
            const header = b64decode(parts[0])
            const payload = b64decode(parts[1])
            const signature = parts[2] || null
            const out = { ok: true, header, payload, signature_present: !!signature }
            if (payload?.exp) {
                out.expires_at = new Date(payload.exp * 1000).toISOString()
                out.expired = Date.now() / 1000 > payload.exp
            }
            if (payload?.iat) out.issued_at = new Date(payload.iat * 1000).toISOString()
            res.json(out)
        } catch (e) { res.status(400).json({ ok: false, error: "Gagal decode JWT: " + e.message }) }
    },
}

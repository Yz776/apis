// /utils/password-strength — password strength checker
function score(password) {
    let s = 0
    const issues = []
    if (!password) return { score: 0, label: "empty", issues: ["empty"] }
    if (password.length < 8) issues.push("too short (<8 chars)")
    if (password.length >= 12) s += 2
    else if (password.length >= 8) s += 1
    if (/[a-z]/.test(password)) s += 1; else issues.push("no lowercase")
    if (/[A-Z]/.test(password)) s += 1; else issues.push("no uppercase")
    if (/[0-9]/.test(password)) s += 1; else issues.push("no digits")
    if (/[^a-zA-Z0-9]/.test(password)) s += 1; else issues.push("no symbols")
    // penalties for common patterns
    if (/(.)\1{2,}/.test(password)) { s -= 1; issues.push("repeated chars") }
    if (/^(123|abc|qwe|password|admin|letmein)/i.test(password)) { s -= 2; issues.push("common pattern") }
    if (s < 0) s = 0
    if (s > 6) s = 6
    const labels = ["very weak", "very weak", "weak", "fair", "good", "strong", "very strong"]
    return { score: s, max: 6, label: labels[s], issues, length: password.length, entropy_bits: Math.round(password.length * Math.log2(uniqueChars(password))) }
}

function uniqueChars(s) {
    let n = 0
    if (/[a-z]/.test(s)) n += 26
    if (/[A-Z]/.test(s)) n += 26
    if (/[0-9]/.test(s)) n += 10
    if (/[^a-zA-Z0-9]/.test(s)) n += 32
    return n || 1
}

export default {
    route: {
        method: "get",
        path: "/utils/password-strength",
        auth: false,
        tags: ["Utils"],
        summary: "Password strength checker",
        description: "Cek kekuatan password: skor 0-6, label, masalah, dan estimasi entropy (bit).",
        parameters: [
            { name: "password", in: "query", required: true, description: "Password yang akan dicek", schema: { type: "string", example: "P@ssw0rd123" } },
        ],
        responses: { "200": { description: "Hasil cek password" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const password = req.query.password
        if (!password) return res.status(400).json({ ok: false, error: "password wajib diisi" })
        const result = score(String(password))
        res.json({ ok: true, ...result })
    },
}

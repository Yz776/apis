// /text/affine — Affine cipher
function gcd(a, b) { return b === 0 ? a : gcd(b, a % b) }
function modInverse(a, m) {
    a = ((a % m) + m) % m
    for (let x = 1; x < m; x++) if ((a * x) % m === 1) return x
    return null
}

function affineEncrypt(text, a, b) {
    if (gcd(a, 26) !== 1) throw new Error(`a=${a} tidak koprima dengan 26 (gcd=${gcd(a, 26)})`)
    return text.split("").map(ch => {
        const c = ch.toUpperCase()
        if (c >= "A" && c <= "Z") {
            const x = c.charCodeAt(0) - 65
            return String.fromCharCode(((a * x + b) % 26) + 65)
        }
        return ch
    }).join("")
}

function affineDecrypt(text, a, b) {
    if (gcd(a, 26) !== 1) throw new Error(`a=${a} tidak koprima dengan 26`)
    const aInv = modInverse(a, 26)
    if (aInv === null) throw new Error("inverse tidak ada")
    return text.split("").map(ch => {
        const c = ch.toUpperCase()
        if (c >= "A" && c <= "Z") {
            const y = c.charCodeAt(0) - 65
            return String.fromCharCode(((aInv * (y - b + 26)) % 26) + 65)
        }
        return ch
    }).join("")
}

export default {
    route: {
        method: "get",
        path: "/text/affine",
        auth: false,
        tags: ["Text"],
        summary: "Affine cipher (encrypt/decrypt)",
        description: "Affine cipher: E(x) = (a*x + b) mod 26. a harus koprima dengan 26 (a = 1,3,5,7,9,11,15,17,19,21,23,25).",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "AFFINE CIPHER" } },
            { name: "a", in: "query", required: false, description: "Koefisien a (default 5)", schema: { type: "integer", default: 5 } },
            { name: "b", in: "query", required: false, description: "Koefisien b (default 8)", schema: { type: "integer", default: 8 } },
            { name: "mode", in: "query", required: false, description: "encrypt atau decrypt (default encrypt)", schema: { type: "string", enum: ["encrypt", "decrypt"], default: "encrypt" } },
        ],
        responses: { "200": { description: "Hasil affine cipher" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = String(req.query.text || "")
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const a = parseInt(req.query.a) || 5
        const b = parseInt(req.query.b) || 8
        const mode = String(req.query.mode || "encrypt").toLowerCase()
        try {
            const result = mode === "encrypt" ? affineEncrypt(text, a, b) : affineDecrypt(text, a, b)
            res.json({ ok: true, mode, a, b, input: text, result })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

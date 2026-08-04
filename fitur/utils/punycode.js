// /utils/punycode — Punycode encode/decode (RFC 3492)
// Implementasi sederhana punycode untuk ASCII domain labels
const PUNY_PREFIX = "xn--"

function punycodeEncode(input) {
    let output = ""
    const basic = []
    let n = 128, delta = 0, bias = 72, m
    for (const c of input) {
        if (c.codePointAt(0) < 128) basic.push(c)
    }
    const b = basic.length
    if (b === input.length) return input
    output += b > 0 ? basic.join("") : ""
    if (b > 0) output += "-"
    const inputCP = [...input].map(c => c.codePointAt(0))
    let h = b
    while (h < inputCP.length) {
        m = Math.min(...inputCP.filter(cp => cp >= n))
        delta += (m - n) * (h + 1)
        n = m
        for (const cp of inputCP) {
            if (cp < n) delta++
            if (cp === n) {
                let q = delta
                for (let k = 36; ; k += 36) {
                    const t = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias
                    if (q < t) break
                    output += String.fromCharCode(digitToChar(t + (q - t) % (36 - t)))
                    q = Math.floor((q - t) / (36 - t))
                }
                output += String.fromCharCode(digitToChar(q))
                delta = h + 1 === inputCP.length ? 0 : Math.floor(delta / 700)
                h++
                bias = 0
                break
            }
        }
        bias = adapt(delta, h + 1, h === b)
        delta = 0
        h++
    }
    return PUNY_PREFIX + output
}

function digitToChar(d) {
    return d + 22 + (d < 26 ? 75 : 0)  // 0-25 -> a-z, 26-35 -> 0-9
}

function charToDigit(c) {
    const code = c.charCodeAt(0)
    if (code >= 48 && code <= 57) return code - 22  // 0-9
    if (code >= 97 && code <= 122) return code - 97  // a-z
    if (code >= 65 && code <= 90) return code - 65  // A-Z
    throw new Error("karakter punycode tidak valid: " + c)
}

function adapt(delta, numpoints, first) {
    delta = first ? Math.floor(delta / 700) : Math.floor(delta / 2)
    delta += Math.floor(delta / numpoints)
    let k = 0
    while (delta > ((36 - 1) * 26) / 2) {
        delta = Math.floor(delta / (36 - 1))
        k += 36
    }
    return k + Math.floor(((36 - 1) + 1) * delta / (delta + 38))
}

function punycodeDecode(input) {
    if (!input.startsWith(PUNY_PREFIX)) return input
    input = input.slice(PUNY_PREFIX.length)
    const basicEnd = input.lastIndexOf("-")
    let output = basicEnd > 0 ? [...input.slice(0, basicEnd)] : []
    let i = basicEnd > 0 ? basicEnd + 1 : 0
    let n = 128, bias = 72, pos = output.length
    while (i < input.length) {
        const oldi = i
        let w = 1
        for (let k = 36; ; k += 36) {
            if (i >= input.length) throw new Error("punycode input tidak valid")
            const digit = charToDigit(input[i++])
            if (digit > (Number.MAX_SAFE_INTEGER - pos) / w) throw new Error("overflow")
            pos += digit * w
            const t = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias
            if (digit < t) break
            if (w > Number.MAX_SAFE_INTEGER / (36 - t)) throw new Error("overflow")
            w *= (36 - t)
        }
        bias = adapt(pos - oldi, output.length + 1, oldi === 0)
        n += Math.floor(pos / (output.length + 1))
        pos %= (output.length + 1)
        output.splice(pos, 0, String.fromCodePoint(n))
        pos++
    }
    return output.join("")
}

export default {
    route: {
        method: "get",
        path: "/utils/punycode",
        auth: false,
        tags: ["Utils"],
        summary: "Punycode encode/decode (RFC 3492)",
        description: "Encode teks/domain ke punycode (xn--...) atau decode kembali. Berguna untuk IDN (Internationalized Domain Names).",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input (label domain tanpa dot)", schema: { type: "string", example: "münchen" } },
            { name: "mode", in: "query", required: false, description: "encode atau decode (default encode)", schema: { type: "string", enum: ["encode", "decode"], default: "encode" } },
        ],
        responses: { "200": { description: "Hasil encode/decode" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const mode = String(req.query.mode || "encode").toLowerCase()
        try {
            let result
            if (mode === "encode") result = punycodeEncode(String(text))
            else if (mode === "decode") result = punycodeDecode(String(text))
            else return res.status(400).json({ ok: false, error: "mode harus encode atau decode" })
            res.json({ ok: true, mode, input: String(text), result })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

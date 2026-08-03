// /utils/fraction — Decimal to fraction and fraction to decimal
function gcd(a, b) { return b === 0n ? a : gcd(b, a % b) }

function decimalToFraction(decimal, maxDenom = 1000000) {
    const sign = decimal < 0 ? -1n : 1n
    let num = Math.abs(decimal)
    let intPart = Math.floor(num)
    let frac = num - intPart
    if (frac === 0) return { numerator: sign * BigInt(intPart), denominator: 1n, mixed: { whole: sign * BigInt(intPart), numerator: 0n, denominator: 1n } }
    // continued fraction algorithm
    let h1 = 1n, h0 = 0n
    let k1 = 0n, k0 = 1n
    let b = frac
    let iterations = 0
    while (iterations < 50) {
        const a = Math.floor(1 / b)
        const h2 = BigInt(a) * h1 + h0
        const k2 = BigInt(a) * k1 + k0
        if (k2 > BigInt(maxDenom)) break
        h1 = h2; h0 = h1
        k1 = k2; k0 = k1
        const newB = 1 / b - a
        if (!isFinite(newB) || newB < 1e-15) {
            h1 = h2; k1 = k2
            break
        }
        b = newB
        iterations++
    }
    const numerator = sign * (BigInt(intPart) * k1 + h1)
    const denominator = k1
    const g = gcd(numerator < 0n ? -numerator : numerator, denominator)
    return {
        numerator: numerator / g,
        denominator: denominator / g,
        mixed: { whole: sign * BigInt(intPart), numerator: h1 / g, denominator: k1 / g },
    }
}

export default {
    route: {
        method: "get",
        path: "/utils/fraction",
        auth: false,
        tags: ["Utils"],
        summary: "Decimal <-> Fraction converter",
        description: "Konversi desimal ke pecahan (fraction) atau pecahan ke desimal.",
        parameters: [
            { name: "decimal", in: "query", required: false, description: "Desimal yang akan dikonversi, cth: 0.75", schema: { type: "number", example: 0.75 } },
            { name: "fraction", in: "query", required: false, description: "Pecahan a/b, cth: 3/4", schema: { type: "string", example: "3/4" } },
            { name: "maxDenom", in: "query", required: false, description: "Penyebut maksimum (default 1000000)", schema: { type: "integer", default: 1000000 } },
        ],
        responses: { "200": { description: "Hasil konversi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        try {
            if (req.query.fraction) {
                const parts = String(req.query.fraction).split("/").map(s => s.trim())
                if (parts.length !== 2) return res.status(400).json({ ok: false, error: "format: a/b" })
                const num = parseFloat(parts[0])
                const denom = parseFloat(parts[1])
                if (isNaN(num) || isNaN(denom) || denom === 0) return res.status(400).json({ ok: false, error: "format: a/b dengan a,b angka dan b!=0" })
                const result = num / denom
                const simplified = decimalToFraction(result, parseInt(req.query.maxDenom) || 1000000)
                return res.json({ ok: true, input: `${num}/${denom}`, decimal: result, simplified: `${simplified.numerator}/${simplified.denominator}` })
            }
            const decimal = parseFloat(req.query.decimal)
            if (isNaN(decimal)) return res.status(400).json({ ok: false, error: "decimal atau fraction wajib diisi" })
            const result = decimalToFraction(decimal, parseInt(req.query.maxDenom) || 1000000)
            res.json({
                ok: true,
                input: decimal,
                fraction: `${result.numerator}/${result.denominator}`,
                mixed: result.mixed.whole === 0n
                    ? `${result.mixed.numerator}/${result.mixed.denominator}`
                    : `${result.mixed.whole} ${result.mixed.numerator}/${result.mixed.denominator}`,
                ...result,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

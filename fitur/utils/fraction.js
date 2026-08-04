// /utils/fraction — Decimal to fraction and fraction to decimal (fixed algorithm)
function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b)
    while (b) { [a, b] = [b, a % b] }
    return a || 1
}

function decimalToFraction(decimal, maxDenom = 1000000) {
    if (!isFinite(decimal)) throw new Error("input tidak finite")
    const sign = decimal < 0 ? -1 : 1
    decimal = Math.abs(decimal)
    const intPart = Math.floor(decimal)
    let frac = decimal - intPart
    if (frac < 1e-15) {
        return {
            numerator: sign * intPart,
            denominator: 1,
            mixed: { whole: sign * intPart, numerator: 0, denominator: 1 },
        }
    }
    // Stern-Brocot / Farey-style search — find best fraction with denom <= maxDenom
    // Use Stern-Brocot tree
    let loN = 0, loD = 1   // 0/1
    let hiN = 1, hiD = 1   // 1/1
    let bestN = 0, bestD = 1, bestErr = frac
    for (let i = 0; i < 100; i++) {
        const midN = loN + hiN
        const midD = loD + hiD
        if (midD > maxDenom) break
        const mid = midN / midD
        const err = Math.abs(mid - frac)
        if (err < bestErr) {
            bestErr = err
            bestN = midN
            bestD = midD
            if (err < 1e-15) break
        }
        if (mid < frac) { loN = midN; loD = midD }
        else { hiN = midN; hiD = midD }
    }
    const g = gcd(bestN, bestD)
    const num = bestN / g
    const den = bestD / g
    const numerator = sign * (intPart * den + num)
    return {
        numerator,
        denominator: den,
        mixed: { whole: sign * intPart, numerator: num, denominator: den },
    }
}

export default {
    route: {
        method: "get",
        path: "/utils/fraction",
        auth: false,
        tags: ["Utils"],
        summary: "Decimal <-> Fraction converter",
        description: "Konversi desimal ke pecahan (fraction) atau pecahan ke desimal. Menggunakan Stern-Brocot tree untuk akurasi tinggi.",
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
                return res.json({
                    ok: true,
                    input: `${num}/${denom}`,
                    decimal: result,
                    simplified: `${simplified.numerator}/${simplified.denominator}`,
                    numerator: simplified.numerator.toString(),
                    denominator: simplified.denominator.toString(),
                })
            }
            const decimal = parseFloat(req.query.decimal)
            if (isNaN(decimal)) return res.status(400).json({ ok: false, error: "decimal atau fraction wajib diisi" })
            const result = decimalToFraction(decimal, parseInt(req.query.maxDenom) || 1000000)
            res.json({
                ok: true,
                input: decimal,
                fraction: `${result.numerator}/${result.denominator}`,
                numerator: result.numerator.toString(),
                denominator: result.denominator.toString(),
                mixed: result.mixed.whole === 0
                    ? `${result.mixed.numerator}/${result.mixed.denominator}`
                    : `${result.mixed.whole} ${result.mixed.numerator}/${result.mixed.denominator}`,
                mixed_obj: {
                    whole: result.mixed.whole.toString(),
                    numerator: result.mixed.numerator.toString(),
                    denominator: result.mixed.denominator.toString(),
                },
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

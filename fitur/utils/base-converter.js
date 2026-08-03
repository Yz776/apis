// /utils/base-converter — Convert numbers between bases 2-36
export default {
    route: {
        method: "get",
        path: "/utils/base-converter",
        auth: false,
        tags: ["Utils"],
        summary: "Base converter (2-36)",
        description: "Konversi bilangan antar basis 2 sampai 36 (biner, oktal, desimal, heksa, dsb).",
        parameters: [
            { name: "value", in: "query", required: true, description: "Nilai yang akan dikonversi", schema: { type: "string", example: "255" } },
            { name: "from", in: "query", required: false, description: "Basis sumber (default 10)", schema: { type: "integer", default: 10, minimum: 2, maximum: 36 } },
            { name: "to", in: "query", required: false, description: "Basis target (jika tidak diisi, kembalikan semua basis 2,8,10,16,32,36)", schema: { type: "integer", minimum: 2, maximum: 36 } },
        ],
        responses: { "200": { description: "Hasil konversi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const value = String(req.query.value || "")
        if (!value) return res.status(400).json({ ok: false, error: "value wajib diisi" })
        const from = Math.min(36, Math.max(2, parseInt(req.query.from) || 10))
        try {
            // parse using BigInt (supports arbitrary size)
            let big
            const negative = value.startsWith("-")
            const clean = negative ? value.slice(1) : value
            try {
                big = BigInt(`0${from.toString().padStart(2, "0")}`).constructor.parseInt // hack to ensure BigInt
                big = BigInt(parseInt(clean, from))
                if (isNaN(parseInt(clean, from))) throw new Error()
            } catch {
                // fallback for big numbers
                let result = 0n
                const baseBig = BigInt(from)
                for (const ch of clean) {
                    const digit = parseInt(ch, 36)
                    if (isNaN(digit) || digit >= from) throw new Error(`char "${ch}" tidak valid untuk basis ${from}`)
                    result = result * baseBig + BigInt(digit)
                }
                big = result
            }
            if (negative) big = -big
            const sign = big < 0n ? "-" : ""
            const abs = big < 0n ? -big : big
            const result = {}
            const targets = req.query.to
                ? [parseInt(req.query.to)]
                : [2, 8, 10, 16, 32, 36]
            for (const t of targets) {
                if (t < 2 || t > 36) continue
                result[`base${t}`] = sign + abs.toString(t)
            }
            res.json({
                ok: true,
                input: value,
                from_base: from,
                conversions: result,
                binary: result.base2,
                octal: result.base8,
                decimal: result.base10,
                hexadecimal: result.base16,
            })
        } catch (e) { res.status(400).json({ ok: false, error: `Tidak dapat parse "${value}" dari basis ${from}: ${e.message}` }) }
    },
}

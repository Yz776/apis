// /utils/ean13 — EAN-13 barcode validator & checksum generator
function ean13Checksum(twelve) {
    let sum = 0
    for (let i = 0; i < 12; i++) {
        const d = parseInt(twelve[i], 10)
        if (isNaN(d)) throw new Error(`digit "${twelve[i]}" tidak valid`)
        sum += i % 2 === 0 ? d : d * 3
    }
    return (10 - (sum % 10)) % 10
}

export default {
    route: {
        method: "get",
        path: "/utils/ean13",
        auth: false,
        tags: ["Utils"],
        summary: "EAN-13 validator & checksum",
        description: "Validasi barcode EAN-13 atau generate digit checksum untuk 12 digit pertama.",
        parameters: [
            { name: "code", in: "query", required: true, description: "Kode EAN-13 (12 atau 13 digit)", schema: { type: "string", example: "590123412345" } },
        ],
        responses: { "200": { description: "Hasil validasi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const code = String(req.query.code || "").replace(/\D/g, "")
        if (!code) return res.status(400).json({ ok: false, error: "code wajib diisi" })
        if (code.length !== 12 && code.length !== 13) return res.status(400).json({ ok: false, error: "code harus 12 atau 13 digit" })
        try {
            const twelve = code.slice(0, 12)
            const checksum = ean13Checksum(twelve)
            const full = twelve + checksum.toString()
            if (code.length === 13) {
                const provided = parseInt(code[12], 10)
                const valid = provided === checksum
                return res.json({
                    ok: true,
                    input: code,
                    is_valid: valid,
                    expected_checksum: checksum,
                    provided_checksum: provided,
                    full_code: full,
                })
            }
            res.json({
                ok: true,
                input: code,
                twelve_digits: twelve,
                checksum,
                full_code: full,
            })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

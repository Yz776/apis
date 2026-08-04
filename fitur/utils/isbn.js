// /utils/isbn — ISBN-10/13 validator
function isbn10Checksum(isbn) {
    let sum = 0
    for (let i = 0; i < 9; i++) sum += parseInt(isbn[i], 10) * (10 - i)
    const last = isbn[9].toUpperCase()
    sum += last === "X" ? 10 : parseInt(last, 10)
    return sum % 11 === 0
}

function isbn13Checksum(isbn) {
    let sum = 0
    for (let i = 0; i < 12; i++) sum += parseInt(isbn[i], 10) * (i % 2 === 0 ? 1 : 3)
    const last = parseInt(isbn[12], 10)
    return (10 - sum % 10) % 10 === last
}

export default {
    route: {
        method: "get",
        path: "/utils/isbn",
        auth: false,
        tags: ["Utils"],
        summary: "ISBN-10/13 validator",
        description: "Validasi nomor ISBN-10 atau ISBN-13 (dengan/ tanpa tanda hubung).",
        parameters: [
            { name: "isbn", in: "query", required: true, description: "Nomor ISBN", schema: { type: "string", example: "978-3-16-148410-0" } },
        ],
        responses: { "200": { description: "Hasil validasi ISBN" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const isbn = String(req.query.isbn || "").replace(/[-\s]/g, "")
        if (!isbn) return res.status(400).json({ ok: false, error: "isbn wajib diisi" })
        let type = null, valid = false
        if (/^\d{9}[\dX]$/i.test(isbn)) { type = "ISBN-10"; valid = isbn10Checksum(isbn) }
        else if (/^\d{13}$/.test(isbn)) { type = "ISBN-13"; valid = isbn13Checksum(isbn) }
        else { return res.json({ ok: true, input: isbn, valid: false, error: "Format tidak dikenali (harus 10 atau 13 digit)" }) }
        res.json({ ok: true, input: isbn, type, valid })
    },
}

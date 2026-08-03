// /utils/isbn-validator — ISBN-10 and ISBN-13 validator
function isValidISBN10(isbn) {
    if (!/^\d{9}[\dX]$/.test(isbn)) return false
    let sum = 0
    for (let i = 0; i < 9; i++) sum += parseInt(isbn[i], 10) * (10 - i)
    const last = isbn[9] === "X" ? 10 : parseInt(isbn[9], 10)
    sum += last
    return sum % 11 === 0
}

function isValidISBN13(isbn) {
    if (!/^\d{13}$/.test(isbn)) return false
    let sum = 0
    for (let i = 0; i < 12; i++) sum += parseInt(isbn[i], 10) * (i % 2 === 0 ? 1 : 3)
    const check = (10 - (sum % 10)) % 10
    return check === parseInt(isbn[12], 10)
}

export default {
    route: {
        method: "get",
        path: "/utils/isbn-validator",
        auth: false,
        tags: ["Utils"],
        summary: "ISBN-10 & ISBN-13 validator",
        description: "Validasi nomor ISBN-10 atau ISBN-13 dengan checksum.",
        parameters: [
            { name: "isbn", in: "query", required: true, description: "Nomor ISBN (boleh dengan tanda hubung)", schema: { type: "string", example: "978-3-16-148410-0" } },
        ],
        responses: { "200": { description: "Hasil validasi ISBN" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const isbn = String(req.query.isbn || "").replace(/[-\s]/g, "")
        if (!isbn) return res.status(400).json({ ok: false, error: "isbn wajib diisi" })
        try {
            const is10 = isbn.length === 10
            const is13 = isbn.length === 13
            if (!is10 && !is13) return res.status(400).json({ ok: false, error: "ISBN harus 10 atau 13 digit" })
            const valid = is10 ? isValidISBN10(isbn) : isValidISBN13(isbn)
            res.json({
                ok: true,
                input: isbn,
                type: `ISBN-${is10 ? 10 : 13}`,
                is_valid: valid,
                check_digit: isbn[isbn.length - 1],
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

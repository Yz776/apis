// /utils/nanoid — NanoID generator (URL-safe, compact)
import crypto from "crypto"

const URL_ALPHABET = "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789_-"

function nanoid(size = 21) {
    const bytes = crypto.randomBytes(size)
    let id = ""
    for (let i = 0; i < size; i++) id += URL_ALPHABET[bytes[i] & 63]
    return id
}

export default {
    route: {
        method: "get",
        path: "/utils/nanoid",
        auth: false,
        tags: ["Utils"],
        summary: "NanoID generator (URL-safe)",
        description: "Hasilkan NanoID (URL-safe, compact, fixed-size). Default 21 karakter.",
        parameters: [
            { name: "size", in: "query", required: false, description: "Panjang ID (default 21)", schema: { type: "integer", default: 21, example: 21 } },
            { name: "count", in: "query", required: false, description: "Jumlah ID (default 1, max 100)", schema: { type: "integer", default: 1, example: 5 } },
        ],
        responses: { "200": { description: "Daftar NanoID" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        let size = parseInt(req.query.size, 10) || 21
        if (size < 1) size = 1
        if (size > 256) size = 256
        let count = parseInt(req.query.count, 10) || 1
        if (count < 1) count = 1
        if (count > 100) count = 100
        const ids = []
        for (let i = 0; i < count; i++) ids.push(nanoid(size))
        res.json({ ok: true, count: ids.length, size, ids })
    },
}

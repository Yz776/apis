// /utils/ulid — ULID generator (Universally Unique Lexicographically Sortable ID)
import crypto from "crypto"

const ENCODE = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
const TIME_LEN = 10
const RAND_LEN = 16

function encodeTime(now, len) {
    let str = ""
    let ts = now
    for (let i = len - 1; i >= 0; i--) {
        const mod = ts % 32
        str = ENCODE[mod] + str
        ts = Math.floor(ts / 32)
    }
    return str
}

function encodeRandom(len) {
    const bytes = crypto.randomBytes(len)
    let str = ""
    for (let i = 0; i < len; i++) str += ENCODE[bytes[i] & 31]
    return str
}

export default {
    route: {
        method: "get",
        path: "/utils/ulid",
        auth: false,
        tags: ["Utils"],
        summary: "ULID generator (sortable, lexicographic)",
        description: "Hasilkan ULID (Universally Unique Lexicographically Sortable Identifier). Sortable by time.",
        parameters: [
            { name: "count", in: "query", required: false, description: "Jumlah ULID (default 1, max 100)", schema: { type: "integer", default: 1, example: 5 } },
        ],
        responses: { "200": { description: "Daftar ULID" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        let count = parseInt(req.query.count, 10) || 1
        if (count < 1) count = 1
        if (count > 100) count = 100
        const ulids = []
        for (let i = 0; i < count; i++) {
            ulids.push(encodeTime(Date.now(), TIME_LEN) + encodeRandom(RAND_LEN))
        }
        res.json({ ok: true, count: ulids.length, ulids })
    },
}

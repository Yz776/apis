// /utils/mac-address — MAC address generator & validator
import crypto from "crypto"

function randomMac(prefix = "") {
    let bytes
    if (prefix) {
        const p = prefix.split(/[:-]/).map(h => parseInt(h, 16))
        if (p.some(n => isNaN(n) || n < 0 || n > 255)) throw new Error("prefix MAC tidak valid")
        bytes = Buffer.from(p)
        if (bytes.length > 6) throw new Error("prefix terlalu panjang")
        const fill = crypto.randomBytes(6 - bytes.length)
        bytes = Buffer.concat([bytes, fill])
    } else {
        bytes = crypto.randomBytes(6)
    }
    bytes[0] = (bytes[0] & 0xFE) | 0x02  // locally administered, unicast
    return bytes
}

export default {
    route: {
        method: "get",
        path: "/utils/mac-address",
        auth: false,
        tags: ["Utils"],
        summary: "MAC address generator/validator",
        description: "Generate MAC address acak (locally administered, unicast) atau validasi MAC yang ada.",
        parameters: [
            { name: "mac", in: "query", required: false, description: "MAC untuk divalidasi (jika kosong, generate baru)", schema: { type: "string", example: "02:42:ac:11:00:01" } },
            { name: "prefix", in: "query", required: false, description: "Prefix OUI (3 byte hex) untuk MAC baru", schema: { type: "string" } },
            { name: "separator", in: "query", required: false, description: "Pemisah (default :, pilih -/.)", schema: { type: "string", default: ":" } },
            { name: "count", in: "query", required: false, description: "Jumlah MAC yang di-generate (default 1, max 100)", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "Hasil generate/validasi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const sep = req.query.separator || ":"
        if (req.query.mac) {
            const m = String(req.query.mac).replace(/[-:.]/g, "")
            const valid = /^[0-9a-fA-F]{12}$/.test(m)
            return res.json({ ok: true, mac: String(req.query.mac), valid, normalized: valid ? m.replace(/(..)/g, "$1" + sep).slice(0, -1) : null })
        }
        const prefix = req.query.prefix || ""
        let count = parseInt(req.query.count, 10) || 1
        if (count < 1) count = 1
        if (count > 100) count = 100
        try {
            const macs = []
            for (let i = 0; i < count; i++) {
                const buf = randomMac(prefix)
                const mac = [...buf].map(b => b.toString(16).padStart(2, "0")).join(sep)
                macs.push(mac)
            }
            res.json({ ok: true, count: macs.length, macs })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

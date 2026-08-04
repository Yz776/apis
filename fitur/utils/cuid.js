// /utils/cuid — CUID (Collision-resistant Unique Identifier) generator
let counter = 0
const DISCRETE_VALUES = 1679616 // 36^6

function pad(num, len) {
    return num.toString(36).padStart(len, "0")
}

function randomBlock(len) {
    let buf = ""
    for (let i = 0; i < len; i++) buf += Math.floor(Math.random() * 36).toString(36)
    return buf
}

function fingerprint() {
    // simple fingerprint based on time and random
    const pid = process.pid.toString(36)
    const t = Date.now().toString(36)
    return (pid + t + randomBlock(4)).slice(0, 8)
}

function cuid() {
    const timestamp = Date.now().toString(36)
    counter = (counter + 1) % DISCRETE_VALUES
    const counterStr = pad(counter, 6)
    const fingerprintStr = fingerprint()
    const random = randomBlock(6)
    return `c${timestamp}${counterStr}${fingerprintStr}${random}`
}

export default {
    route: {
        method: "get",
        path: "/utils/cuid",
        auth: false,
        tags: ["Utils"],
        summary: "CUID generator",
        description: "Menghasilkan Collision-resistant Unique Identifier (CUID).",
        parameters: [
            { name: "count", in: "query", required: false, description: "Jumlah CUID (default 1, max 100)", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "CUID" } },
    },
    handler: async (req, res) => {
        try {
            const count = Math.min(100, Math.max(1, parseInt(req.query.count) || 1))
            const ids = []
            for (let i = 0; i < count; i++) ids.push(cuid())
            res.json({ ok: true, count, ids, sample: ids[0] })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

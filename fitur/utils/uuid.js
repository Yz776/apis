// /utils/uuid — UUID v4 generator
import crypto from "crypto"

export default {
    route: {
        method: "get",
        path: "/utils/uuid",
        auth: false,
        tags: ["Utils"],
        summary: "UUID v4 generator",
        description: "Menghasilkan satu atau beberapa UUID v4 (RFC 4122).",
        parameters: [
            { name: "count", in: "query", required: false, description: "Jumlah UUID yang dihasilkan (1-100, default 1)", schema: { type: "integer", default: 1, example: 5 } },
        ],
        responses: { "200": { description: "Daftar UUID" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        let count = parseInt(req.query.count, 10) || 1
        if (count < 1) count = 1
        if (count > 100) count = 100
        const uuids = []
        for (let i = 0; i < count; i++) uuids.push(crypto.randomUUID())
        res.json({ ok: true, count: uuids.length, uuids })
    },
}

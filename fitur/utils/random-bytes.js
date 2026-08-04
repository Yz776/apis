// /utils/random-bytes — cryptographically secure random bytes
import crypto from "crypto"

export default {
    route: {
        method: "get",
        path: "/utils/random-bytes",
        auth: false,
        tags: ["Utils"],
        summary: "Random bytes (cryptographically secure)",
        description: "Hasilkan byte acak (cryptographically secure) dalam hex, base64, atau base64url.",
        parameters: [
            { name: "length", in: "query", required: false, description: "Panjang byte (default 16, max 1024)", schema: { type: "integer", default: 16, example: 32 } },
            { name: "encoding", in: "query", required: false, description: "Encoding output (default hex)", schema: { type: "string", enum: ["hex", "base64", "base64url"], default: "hex" } },
        ],
        responses: { "200": { description: "Random bytes" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        let len = parseInt(req.query.length, 10) || 16
        if (len < 1) len = 1
        if (len > 1024) len = 1024
        const enc = String(req.query.encoding || "hex").toLowerCase()
        if (!["hex", "base64", "base64url"].includes(enc)) return res.status(400).json({ ok: false, error: "encoding tidak valid" })
        const bytes = crypto.randomBytes(len)
        res.json({ ok: true, length: len, encoding: enc, result: bytes.toString(enc) })
    },
}

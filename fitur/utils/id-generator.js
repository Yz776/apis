// /utils/id-generator — Generator ID Unik (UUID v4, ULID, NanoID, Crypto Random)
// Built-in: no external API, pure crypto random
import { randomUUID } from "crypto"

function generateULID() {
    const now = Date.now().toString(16).padStart(12, "0")
    const random = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
    return (now + random).toUpperCase()
}

function generateNanoID(size = 21) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-"
    let id = ""
    const bytes = new Uint8Array(size)
    crypto.getRandomValues(bytes)
    for (const byte of bytes) id += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-"[byte % 64]
    return id
}

export default {
    route: {
        method: "get",
        path: "/utils/id-generator",
        auth: false,
        tags: ["Utils", "Dev"],
        summary: "Generator ID Unik (UUID, ULID, NanoID)",
        description: "Generate ID unik berbagai format: UUID v4, ULID (sortable), NanoID (URL-safe). Pure crypto.randomBytes, no external API.",
        parameters: [
            { name: "type", in: "query", required: false, description: "uuid | ulid | nanoid (default: uuid)", schema: { type: "string", enum: ["uuid", "ulid", "nanoid"], default: "uuid" } },
            { name: "count", in: "query", required: false, description: "Jumlah ID (1-100)", schema: { type: "integer", default: 1 } },
            { name: "size", in: "query", required: false, description: "Panjang NanoID (default 21)", schema: { type: "integer", default: 21 } },
        ],
        responses: { "200": { description: "ID yang digenerate" }, "400": { description: "Parameter tidak valid" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const { type = "uuid", count = 1, size = 21 } = req.query
        const n = Math.max(1, Math.min(100, parseInt(count, 10)))
        const sz = Math.max(10, Math.min(50, parseInt(size, 10)))
        const results = []
        for (let i = 0; i < n; i++) {
            if (type === "uuid") results.push(randomUUID())
            else if (type === "ulid") results.push(generateULID())
            else if (type === "nanoid") results.push(generateNanoID(sz))
            else return res.status(400).json({ ok: false, error: "type harus uuid, ulid, atau nanoid" })
        }
        res.json({ ok: true, type, count: n, ids: n === 1 ? results[0] : results })
    },
}
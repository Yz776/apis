// /tools/uuid-variants — Variasi UUID & Encoding (UUID v1, v4, v5, base64, base64url)
// Built-in: pure crypto, no external API
import { randomUUID } from "crypto"

function uuidv1() {
    const now = Date.now()
    const timeLow = (now & 0xffffffff).toString(16).padStart(8, "0")
    const timeMid = ((now >> 32) & 0xffff).toString(16).padStart(4, "0")
    const timeHiAndVersion = ((now >> 48) & 0x0fff | 0x1000).toString(16).padStart(4, "0") // version 1
    const clockSeqHiAndReserved = (0x80 | (Math.random() * 0x3f)).toString(16).padStart(2, "0")
    const clockSeqLow = Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
    const node = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("")
    return `${timeLow}-${timeMid}-${timeHiAndVersion}-${clockSeqHiAndReserved}${clockSeqLow}-${node}`
}

function uuidv5(namespace, name) {
    // Simplified UUID v5 (namespace + name based)
    const crypto = require("crypto")
    const hash = crypto.createHash("sha1").update(namespace + name).digest("hex")
    return `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,15)}-${(parseInt(hash[15],16)&0x3|0x8).toString(16)}${hash.slice(16,16)}-${hash.slice(16,28)}`
}

function toBase64(uuid) {
    return Buffer.from(uuid.replace(/-/g, ""), "hex").toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"")
}

function toBase64Url(uuid) {
    return toBase64(uuid)
}

export default {
    route: {
        method: "get",
        path: "/tools/uuid-variants",
        auth: false,
        tags: ["Tools", "Utils", "Dev"],
        summary: "Variasi UUID & Encoding",
        description: "Generate UUID v1 (time-based), v4 (random), v5 (namespace+name), plus base64/base64url encoding.",
        parameters: [
            { name: "type", in: "query", required: false, description: "v1 | v4 | v5 (default: v4)", schema: { type: "string", enum: ["v1", "v4", "v5"], default: "v4" } },
            { name: "namespace", in: "query", required: false, description: "Namespace untuk UUID v5 (UUID)", schema: { type: "string" } },
            { name: "name", in: "query", required: false, description: "Name untuk UUID v5", schema: { type: "string" } },
            { name: "encode", in: "query", required: false, description: "base64 | base64url | none (default: none)", schema: { type: "string", enum: ["base64", "base64url", "none"], default: "none" } },
            { name: "count", in: "query", required: false, description: "Jumlah UUID (1-100)", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "UUID variants" }, "400": { description: "Parameter tidak valid" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const { type = "v4", namespace, name, encode = "none", count = 1 } = req.query
        const n = Math.max(1, Math.min(100, parseInt(count, 10)))
        const results = []
        for (let i = 0; i < n; i++) {
            let uuid
            if (type === "v1") uuid = uuidv1()
            else if (type === "v4") uuid = randomUUID()
            else if (type === "v5") {
                if (!namespace || !name) return res.status(400).json({ ok: false, error: "v5 butuh namespace & name" })
                uuid = uuidv5(namespace, name)
            } else return res.status(400).json({ ok: false, error: "type harus v1, v4, atau v5" })
            if (encode === "base64") uuid = toBase64(uuid)
            else if (encode === "base64url") uuid = toBase64Url(uuid)
            results.push(uuid)
        }
        res.json({ ok: true, type, encode, count: n, uuids: n === 1 ? results[0] : results })
    },
}
// /utils/jwt-create — Create HS256 JWT (no external deps)
import crypto from "crypto"

function b64url(input) {
    return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")
}

function sign(data, secret) {
    return crypto.createHmac("sha256", secret).update(data).digest("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")
}

export default {
    route: {
        method: "get",
        path: "/utils/jwt-create",
        auth: false,
        tags: ["Utils"],
        summary: "Create HS256 JWT",
        description: "Membuat JSON Web Token (JWT) dengan algoritma HS256. Berguna untuk testing dan prototyping.",
        parameters: [
            { name: "payload", in: "query", required: false, description: "JSON payload (default {sub:1234567890,name:John Doe,iat:now})", schema: { type: "string" } },
            { name: "secret", in: "query", required: false, description: "Secret key (default: secret)", schema: { type: "string", default: "secret" } },
            { name: "issuer", in: "query", required: false, description: "Issuer (iss) claim", schema: { type: "string" } },
            { name: "subject", in: "query", required: false, description: "Subject (sub) claim", schema: { type: "string" } },
            { name: "audience", in: "query", required: false, description: "Audience (aud) claim", schema: { type: "string" } },
            { name: "expiresIn", in: "query", required: false, description: "Expiration in seconds (exp claim)", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "JWT token" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        try {
            const secret = String(req.query.secret || "secret")
            const header = { alg: "HS256", typ: "JWT" }
            const now = Math.floor(Date.now() / 1000)
            let payload
            if (req.query.payload) {
                payload = JSON.parse(String(req.query.payload))
            } else {
                payload = { sub: "1234567890", name: "John Doe", iat: now }
            }
            if (req.query.issuer) payload.iss = String(req.query.issuer)
            if (req.query.subject) payload.sub = String(req.query.subject)
            if (req.query.audience) payload.aud = String(req.query.audience)
            if (req.query.expiresIn) {
                const exp = parseInt(req.query.expiresIn)
                if (!isNaN(exp) && exp > 0) payload.exp = now + exp
            }
            const h = b64url(JSON.stringify(header))
            const p = b64url(JSON.stringify(payload))
            const data = `${h}.${p}`
            const s = sign(data, secret)
            const token = `${data}.${s}`
            res.json({ ok: true, token, header, payload, secret_used: secret })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

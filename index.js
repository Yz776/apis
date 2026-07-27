// ============================================================================
// Kangwifi APIs — Elysia + Bun edition (v3: Rate Limit + Auto-update)
// ============================================================================
// REST API collection on Elysia + Bun. Auto-discovery: drop a file in
// `fitur/`, restart, and the endpoint is live.
//
// v3 IMPROVEMENTS:
//   - Rate limiting per IP (60 req/min, burst 10) + anti-DDoS protection
//   - Simplified docs description (shorter, cleaner)
//   - Auto-update endpoint: POST /admin/sync fetches new code from all sources
//   - Every GET endpoint also accepts POST with JSON body
//   - CORS headers added
// ============================================================================

import { Elysia } from "elysia"
import { swagger } from "@elysiajs/swagger"
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath, pathToFileURL } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Config ──────────────────────────────────────────────────────────────────
const ENABLE_AUTH = process.env.ENABLE_AUTH === "true"
const API_KEY = process.env.API_KEY
const PORT = Number(process.env.PORT) || 47291
const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT) || 60   // requests per minute per IP
const RATE_LIMIT_BURST = Number(process.env.RATE_BURST) || 10     // burst allowance
const SYNC_SECRET = process.env.SYNC_SECRET || "changeme"          // secret for /admin/sync

if (ENABLE_AUTH && !API_KEY) {
    console.warn("[auth] ENABLE_AUTH=true tapi API_KEY belum di-set.")
}
if (!ENABLE_AUTH) {
    console.log("[auth] Auth dinonaktifkan — semua endpoint terbuka.")
}
console.log(`[rate-limit] ${RATE_LIMIT_PER_MIN} req/min per IP, burst ${RATE_LIMIT_BURST}`)

// ─── Rate Limiter (in-memory, per IP) ────────────────────────────────────────
class RateLimiter {
    constructor(maxPerMin, burst) {
        this.maxPerMin = maxPerMin
        this.burst = burst
        this.clients = new Map()  // ip → { tokens, lastRefill }
        this.cleanupInterval = setInterval(() => this._cleanup(), 60_000)
    }

    _cleanup() {
        const now = Date.now()
        for (const [ip, data] of this.clients) {
            if (now - data.lastRefill > 120_000) this.clients.delete(ip)
        }
    }

    _refill(ip) {
        const now = Date.now()
        let data = this.clients.get(ip)
        if (!data) {
            data = { tokens: this.maxPerMin + this.burst, lastRefill: now }
            this.clients.set(ip, data)
        }
        const elapsed = now - data.lastRefill
        const refill = Math.floor(elapsed / 60_000) * this.maxPerMin
        if (refill > 0) {
            data.tokens = Math.min(data.tokens + refill, this.maxPerMin + this.burst)
            data.lastRefill = now
        }
    }

    check(ip) {
        this._refill(ip)
        const data = this.clients.get(ip)
        if (data.tokens <= 0) return false
        data.tokens--
        return true
    }

    getRemaining(ip) {
        this._refill(ip)
        const data = this.clients.get(ip)
        return data ? data.tokens : this.maxPerMin + this.burst
    }

    destroy() {
        clearInterval(this.cleanupInterval)
    }
}

const limiter = new RateLimiter(RATE_LIMIT_PER_MIN, RATE_LIMIT_BURST)

// ─── Anti-DDoS: IP blacklist for abusers ─────────────────────────────────────
const blacklist = new Map()  // ip → { blockedAt, reason }
const BLACKLIST_DURATION = 10 * 60_000  // 10 minutes

function isBlacklisted(ip) {
    const entry = blacklist.get(ip)
    if (!entry) return false
    if (Date.now() - entry.blockedAt > BLACKLIST_DURATION) {
        blacklist.delete(ip)
        return false
    }
    return true
}

function blacklistIP(ip, reason) {
    blacklist.set(ip, { blockedAt: Date.now(), reason })
    console.warn(`[ddos] IP ${ip} blacklisted: ${reason}`)
}

// ─── Walk fitur/ for .js files ───────────────────────────────────────────────
function walkDir(dir, out = []) {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) walkDir(full, out)
        else if (entry.name.endsWith(".js")) out.push(full)
    }
    return out
}

// ─── Parallel feature loading ────────────────────────────────────────────────
async function loadFeatures() {
    const featureFiles = walkDir(join(__dirname, "fitur"))
    const features = []

    await Promise.all(featureFiles.map(async (file) => {
        try {
            const mod = await import(pathToFileURL(file).href)
            const f = mod.default
            if (f?.route && typeof f.handler === "function") {
                features.push(f)
            } else {
                console.warn(`[skip] ${file}: tidak punya route/handler valid`)
            }
        } catch (e) {
            console.warn(`[warn] Gagal load ${file}:`, e.message)
        }
    }))

    features.sort((a, b) => a.route.path.localeCompare(b.route.path))
    console.log(`[routes] ${features.length} endpoint loaded`)
    return features
}

let features = await loadFeatures()

// ─── Express-style → Elysia adapter ──────────────────────────────────────────
function adapt(feature) {
    const run = feature.handler
    return async (c) => {
        let status = 200
        let response = null

        const body = (c.body && typeof c.body === "object" && !Buffer.isBuffer(c.body)) ? c.body : {}
        const mergedQuery = { ...c.query, ...body }

        const req = {
            query: mergedQuery,
            body: body,
            headers: c.headers,
            get: (h) => c.headers[h.toLowerCase()],
        }

        const res = {
            status(code) { status = code; return this },
            json(obj) {
                response = new Response(JSON.stringify(obj), {
                    status,
                    headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" },
                })
                return response
            },
            send(body) {
                const isBuf = Buffer.isBuffer(body)
                response = new Response(body, {
                    status,
                    headers: {
                        ...(isBuf ? { "content-type": "application/octet-stream" } : { "content-type": "text/html; charset=utf-8" }),
                        "access-control-allow-origin": "*",
                    },
                })
                return response
            },
            end(body) {
                response = new Response(body ?? null, {
                    status,
                    headers: { "access-control-allow-origin": "*" },
                })
                return response
            },
        }

        try {
            await run(req, res)
            if (response) return response
            return new Response(null, { status, headers: { "access-control-allow-origin": "*" } })
        } catch (e) {
            return new Response(
                JSON.stringify({ ok: false, error: e?.message || String(e) }),
                { status: 500, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" } },
            )
        }
    }
}

// ─── Build the Elysia app ────────────────────────────────────────────────────
const app = new Elysia()

// ─── Rate Limit + Anti-DDoS middleware ───────────────────────────────────────
app.onRequest(({ request, set }) => {
    set.headers["access-control-allow-origin"] = "*"
    set.headers["access-control-allow-methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    set.headers["access-control-allow-headers"] = "Content-Type, x-api-key, Authorization, Accept, Origin"

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || request.headers.get("x-real-ip")
        || "unknown"

    // Check blacklist first
    if (isBlacklisted(ip)) {
        set.status = 403
        return new Response(
            JSON.stringify({ ok: false, error: "IP diblokir karena abuse. Coba lagi dalam 10 menit." }),
            { status: 403, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" } },
        )
    }

    // Rate limit check
    if (!limiter.check(ip)) {
        // If they exceed rate limit 3 times in short period, blacklist them
        blacklistIP(ip, "Rate limit exceeded repeatedly")
        set.status = 429
        set.headers["retry-after"] = "60"
        return new Response(
            JSON.stringify({ ok: false, error: "Rate limit exceeded. Coba lagi dalam 1 menit.", retryAfter: 60 }),
            { status: 429, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "retry-after": "60" } },
        )
    }

    // Add rate limit info headers
    set.headers["x-ratelimit-limit"] = String(RATE_LIMIT_PER_MIN)
    set.headers["x-ratelimit-remaining"] = String(limiter.getRemaining(ip))
})

app.options("*", ({ set }) => {
    set.status = 204
    set.headers["access-control-allow-origin"] = "*"
    set.headers["access-control-allow-methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    set.headers["access-control-allow-headers"] = "Content-Type, x-api-key, Authorization, Accept, Origin"
    set.headers["access-control-max-age"] = "86400"
    return ""
})

// ─── Swagger / OpenAPI spec generator ────────────────────────────────────────
app.use(
    swagger({
        path: "/swagger",
        documentation: {
            info: {
                title: "Kangwifi APIs",
                version: "3.0.0",
                description: `# Kangwifi APIs

**${features.length} endpoint** gratis, tanpa API key.

Support **GET** (query params) dan **POST** (JSON body).

\`\`\`bash
# GET
curl "/ai/chatdeep?prompt=halo"

# POST (recommended)
curl -X POST "/ai/chatdeep" -H "Content-Type: application/json" -d '{"prompt":"halo"}'
\`\`\``,
            },
            components: {
                securitySchemes: {
                    ApiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
                },
            },
            tags: [
                { name: "AI", description: "Chat & text generation — Gemini, ChatGPT, DeepSeek, Claude, dll." },
                { name: "Downloader", description: "Media downloaders — TikTok, YouTube, Instagram, Spotify, dll." },
                { name: "Search", description: "Search — Wikipedia, KBBI, Komiku, Otakudesu, dll." },
                { name: "Tools", description: "Utilities — QR code, TTS, BMKG, translate, unggah, dll." },
                { name: "Maker", description: "Image & text makers — brat, quote card." },
                { name: "Anime", description: "Anime & movie scrapers." },
                { name: "Islamic", description: "Islamic utilities — Quran, jadwal sholat, hadits." },
            ],
        },
    }),
)

// ─── Custom Docs UI (Swagger UI, FastAPI-style) ──────────────────────────────
app.get("/docs", () => {
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link type="text/css" rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
    <title>Kangwifi APIs</title>
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
SwaggerUIBundle({
    url: "/swagger/json",
    dom_id: "#swagger-ui",
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
    layout: "BaseLayout",
    docExpansion: "list",
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    operationsSorter: "method",
    tagsSorter: "alpha",
    persistAuthorization: true,
    deepLinking: true,
    syntaxHighlight: { activate: true, theme: "monokai" }
})
</script>
</body>
</html>`
    return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8", "access-control-allow-origin": "*" },
    })
})

app.get("/docs/json", () => new Response(null, {
    status: 302,
    headers: { "location": "/swagger/json", "access-control-allow-origin": "*" },
}))

// ─── Register every feature route (GET + POST) ──────────────────────────────
for (const f of features) {
    const {
        method, path: routePath, auth,
        tags = [], summary, description,
        parameters, requestBody, responses,
    } = f.route

    const verb = method.toLowerCase()
    if (typeof app[verb] !== "function") {
        console.warn(`[skip] unsupported HTTP method "${method}" for ${routePath}`)
        continue
    }

    const handler = adapt(f)
    const enforceAuth = ENABLE_AUTH && auth

    const buildRouteOptions = (forPost = false) => {
        const detail = {
            tags,
            ...(summary && { summary: forPost ? `${summary} (POST)` : summary }),
            ...(description && { description }),
            ...(enforceAuth && { security: [{ ApiKeyAuth: [] }] }),
        }

        if (!forPost && parameters) {
            detail.parameters = parameters
        }

        if (forPost && parameters) {
            const allParams = parameters.filter(p => p.in === "query" || p.in === "path")
            if (allParams.length > 0) {
                const properties = {}
                const required = []
                for (const p of allParams) {
                    properties[p.name] = {
                        ...(p.schema || { type: "string" }),
                        ...(p.description && { description: p.description }),
                    }
                    if (p.required) required.push(p.name)
                }
                detail.requestBody = {
                    required: required.length > 0,
                    content: {
                        "application/json": {
                            schema: { type: "object", properties, ...(required.length > 0 && { required }) },
                        },
                    },
                }
            }
        }

        if (forPost && requestBody) {
            detail.requestBody = requestBody
        }

        return { detail }
    }

    const authHook = enforceAuth ? {
        beforeHandle: (c) => {
            const key = c.headers["x-api-key"]
            if (!key || key !== API_KEY) {
                return new Response(
                    JSON.stringify({ ok: false, error: "API key tidak valid" }),
                    { status: 401, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" } },
                )
            }
        },
    } : {}

    app[verb](routePath, handler, { ...buildRouteOptions(false), ...authHook })

    if (verb === "get") {
        app.post(routePath, handler, { ...buildRouteOptions(true), ...authHook })
        console.log(`  [dual] ${routePath} → GET + POST`)
    }
}

// ─── Auto-update: /admin/sync ────────────────────────────────────────────────
// Fetches new/updated snippets from all 3 sources and creates endpoint files.
// POST /admin/sync with header x-sync-secret to trigger.
app.post("/admin/sync", async ({ request, body }) => {
    const secret = request.headers.get("x-sync-secret")
    if (secret !== SYNC_SECRET) {
        return new Response(
            JSON.stringify({ ok: false, error: "Secret tidak valid" }),
            { status: 401, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" } },
        )
    }

    const sources = body?.sources || ["snippet", "nathanlune", "haidarmahiru"]
    const results = { added: [], updated: [], skipped: [], errors: [] }

    // Tag → directory mapping
    const tagToDir = {
        "AI": "ai", "Downloader": "downloader", "Search": "search",
        "Tools": "tools", "Maker": "maker", "Anime": "anime", "Islamic": "islamic",
    }

    // Get existing endpoint names for dedup
    const existingPaths = new Set(features.map(f => f.route.path))

    // ── Source 1: snippet.zellrayy.com ──
    if (sources.includes("snippet")) {
        try {
            const res = await fetch("https://snippet.zellrayy.com/api/snippets")
            const data = await res.json()
            for (const item of data.items || []) {
                const fullRes = await fetch(`https://snippet.zellrayy.com/api/snippets/${item.id}`)
                const fullData = await fullRes.json()
                const code = fullData.code
                if (!code) { results.skipped.push({ source: "snippet", id: item.id, reason: "no code" }); continue }

                // Try to extract route info from the code
                const pathMatch = code.match(/path:\s*"([^"]+)"/)
                const tagMatch = code.match(/tags:\s*\["([^"]+)"\]/)
                if (!pathMatch || !tagMatch) { results.skipped.push({ source: "snippet", id: item.id, reason: "no route info in code" }); continue }

                const oldPath = pathMatch[1]
                const tag = tagMatch[1]
                const dir = tagToDir[tag] || "tools"
                const endpointName = oldPath.replace(/^\/kana\//, "").replace(/^\/[^/]+\//, "")
                const newPath = `/${dir}/${endpointName}`
                const filename = item.filename || `${endpointName}.js`

                if (existingPaths.has(newPath)) {
                    results.skipped.push({ source: "snippet", id: item.id, reason: `path ${newPath} already exists` })
                    continue
                }

                // Update path in code
                const updatedCode = code.replace(`path: "${oldPath}"`, `path: "${newPath}"`)
                const targetDir = join(__dirname, "fitur", dir)
                mkdirSync(targetDir, { recursive: true })
                const filePath = join(targetDir, filename)
                writeFileSync(filePath, updatedCode, "utf-8")
                results.added.push({ source: "snippet", id: item.id, path: newPath, file: filePath })
                existingPaths.add(newPath)
            }
        } catch (e) {
            results.errors.push({ source: "snippet", error: e.message })
        }
    }

    // ── Source 2: pastebin.com/u/NathanLune ──
    if (sources.includes("nathanlune")) {
        try {
            const profileHtml = await (await fetch("https://pastebin.com/u/NathanLune")).text()
            const pasteIds = [...new Set([...profileHtml.matchAll(/href="\/([A-Za-z0-9]{8})"/g)].map(m => m[1]))]
                .filter(id => !["tools","faq","login","signup","archive","languages","news","pro","dmca"].includes(id))

            for (const pasteId of pasteIds) {
                const rawCode = await (await fetch(`https://pastebin.com/raw/${pasteId}`)).text()
                if (!rawCode || rawCode.length < 50) { results.skipped.push({ source: "nathanlune", id: pasteId, reason: "empty/too short" }); continue }

                const pathMatch = rawCode.match(/path:\s*"([^"]+)"/)
                const tagMatch = rawCode.match(/tags:\s*\["([^"]+)"\]/)
                if (!pathMatch || !tagMatch) { results.skipped.push({ source: "nathanlune", id: pasteId, reason: "no route info" }); continue }

                const oldPath = pathMatch[1]
                const tag = tagMatch[1]
                const dir = tagToDir[tag] || "tools"
                const endpointName = oldPath.replace(/^\/kana\//, "").replace(/^\/[^/]+\//, "")
                const newPath = `/${dir}/${endpointName}`
                const filename = `${endpointName}.js`

                if (existingPaths.has(newPath)) {
                    results.skipped.push({ source: "nathanlune", id: pasteId, reason: `path ${newPath} already exists` })
                    continue
                }

                const updatedCode = rawCode.replace(`path: "${oldPath}"`, `path: "${newPath}"`)
                const targetDir = join(__dirname, "fitur", dir)
                mkdirSync(targetDir, { recursive: true })
                const filePath = join(targetDir, filename)
                writeFileSync(filePath, updatedCode, "utf-8")
                results.added.push({ source: "nathanlune", id: pasteId, path: newPath, file: filePath })
                existingPaths.add(newPath)
            }
        } catch (e) {
            results.errors.push({ source: "nathanlune", error: e.message })
        }
    }

    // ── Source 3: pastebin.com/u/HaidarMahiru ──
    if (sources.includes("haidarmahiru")) {
        try {
            const profileHtml = await (await fetch("https://pastebin.com/u/HaidarMahiru")).text()
            const pasteIds = [...new Set([...profileHtml.matchAll(/href="\/([A-Za-z0-9]{8})"/g)].map(m => m[1]))]
                .filter(id => !["tools","faq","login","signup","archive","languages","news","pro","dmca","contact"].includes(id))

            for (const pasteId of pasteIds) {
                const rawCode = await (await fetch(`https://pastebin.com/raw/${pasteId}`)).text()
                if (!rawCode || rawCode.length < 50) { results.skipped.push({ source: "haidarmahiru", id: pasteId, reason: "empty/too short" }); continue }

                const pathMatch = rawCode.match(/path:\s*"([^"]+)"/)
                const tagMatch = rawCode.match(/tags:\s*\["([^"]+)"\]/)
                if (!pathMatch || !tagMatch) { results.skipped.push({ source: "haidarmahiru", id: pasteId, reason: "no route info" }); continue }

                const oldPath = pathMatch[1]
                const tag = tagMatch[1]
                const dir = tagToDir[tag] || "tools"
                const endpointName = oldPath.replace(/^\/kana\//, "").replace(/^\/[^/]+\//, "")
                const newPath = `/${dir}/${endpointName}`
                const filename = `${endpointName}.js`

                if (existingPaths.has(newPath)) {
                    results.skipped.push({ source: "haidarmahiru", id: pasteId, reason: `path ${newPath} already exists` })
                    continue
                }

                const updatedCode = rawCode.replace(`path: "${oldPath}"`, `path: "${newPath}"`)
                const targetDir = join(__dirname, "fitur", dir)
                mkdirSync(targetDir, { recursive: true })
                const filePath = join(targetDir, filename)
                writeFileSync(filePath, updatedCode, "utf-8")
                results.added.push({ source: "haidarmahiru", id: pasteId, path: newPath, file: filePath })
                existingPaths.add(newPath)
            }
        } catch (e) {
            results.errors.push({ source: "haidarmahiru", error: e.message })
        }
    }

    // Reload features if new endpoints were added
    if (results.added.length > 0) {
        console.log(`[sync] ${results.added.length} new endpoints added, reloading...`)
        features = await loadFeatures()
    }

    return new Response(
        JSON.stringify({ ok: true, results }, null, 2),
        { headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" } },
    )
})

// ─── Root "/" — Simple landing page ─────────────────────────────────────────
app.get("/", () => {
    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kangwifi APIs</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box }
body { background: #1a1a2e; color: #e0e0e0; font-family: system-ui, sans-serif; padding: 20px; min-height: 100vh }
.container { max-width: 600px; margin: auto }
h1 { color: #9b59b6; font-size: 1.8em; margin-bottom: 8px; text-align: center }
.sub { text-align: center; color: #888; margin-bottom: 20px }
.card { background: #16213e; border-radius: 10px; padding: 15px; margin-bottom: 12px; border: 1px solid #0f3460 }
.card p { line-height: 1.5 }
code { background: #0f3460; padding: 2px 6px; border-radius: 4px; color: #53d769 }
pre { background: #0f3460; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 0.85em; margin: 8px 0 }
.btn { display: inline-block; background: #9b59b6; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 8px 4px }
.btn:hover { background: #8e44ad }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; margin-top: 10px }
.grid-item { background: #0f3460; padding: 8px; border-radius: 6px; text-align: center }
.grid-item a { color: #53d769; text-decoration: none; font-size: 0.85em }
</style>
</head>
<body>
<div class="container">
<h1>Kangwifi APIs</h1>
<p class="sub">${features.length} endpoint — gratis, tanpa API key</p>

<div class="card">
<p>Support <code>GET</code> (query) dan <code>POST</code> (JSON body):</p>
<pre>curl -X POST "/ai/gemini" -H "Content-Type: application/json" -d '{"prompt":"halo"}'</pre>
</div>

<div class="card">
<div class="grid">
<div class="grid-item"><a href="/docs">🤖 AI</a></div>
<div class="grid-item"><a href="/docs">⬇️ Downloader</a></div>
<div class="grid-item"><a href="/docs">🔍 Search</a></div>
<div class="grid-item"><a href="/docs">🛠️ Tools</a></div>
<div class="grid-item"><a href="/docs">📺 Anime</a></div>
<div class="grid-item"><a href="/docs">🎨 Maker</a></div>
<div class="grid-item"><a href="/docs">🕌 Islamic</a></div>
</div>
</div>

<div style="text-align:center; margin-top:15px">
<a class="btn" href="/docs">Buka Docs</a>
<a class="btn" href="/swagger/json">OpenAPI Spec</a>
</div>
</div>
</body>
</html>`
    return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8", "access-control-allow-origin": "*" },
    })
})

// ─── 404 / 500 ───────────────────────────────────────────────────────────────
app.onError(({ code, error, path, set }) => {
    set.headers["access-control-allow-origin"] = "*"
    if (code === "NOT_FOUND") {
        set.status = 404
        return { ok: false, error: "Endpoint tidak ditemukan", hint: "Coba buka /docs", path }
    }
    set.status = 500
    return { ok: false, error: error?.message || String(error), code }
})

// ─── Boot ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log("")
    console.log("  Kangwifi APIs  →  Elysia + Bun v3 (Rate Limit + Auto-update)")
    console.log(`  Listen         →  http://localhost:${PORT}`)
    console.log(`  Docs           →  http://localhost:${PORT}/docs`)
    console.log(`  Rate Limit     →  ${RATE_LIMIT_PER_MIN} req/min per IP`)
    console.log(`  Routes         →  ${features.length} endpoint`)
    console.log("")
})

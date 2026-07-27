// ============================================================================
// Kangwifi APIs — Elysia + Bun edition (v2: POST + CORS + Easy-mode)
// ----------------------------------------------------------------------------
// REST API collection built on Elysia + Bun. Auto-discovery: drop a file in
// `fitur/`, restart, and the endpoint is live. Each feature file exports
// `default { route, handler }` where `route` carries OpenAPI metadata
// (method, path, tags, summary, description, parameters, responses, auth)
// and `handler` is an Express-style `(req, res) => { ... }` function.
//
// v2 IMPROVEMENTS:
//   - Every GET endpoint now also accepts POST with JSON body
//   - req.query auto-merges JSON body params (body overrides query)
//   - CORS headers added (Access-Control-Allow-Origin: *)
//   - Root "/" returns a simple usage guide (not just redirect to /docs)
//   - Better mobile/Hoppscotch UX — POST with {"prompt": "..."} is way easier
//   - Docs UI: custom Swagger UI (FastAPI-style, clean, properly configured)
// ============================================================================

import { Elysia } from "elysia"
import { swagger } from "@elysiajs/swagger"
import { readdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath, pathToFileURL } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Config ──────────────────────────────────────────────────────────────────
const ENABLE_AUTH = process.env.ENABLE_AUTH === "true"
const API_KEY = process.env.API_KEY
const PORT = Number(process.env.PORT) || 47291

if (ENABLE_AUTH && !API_KEY) {
    console.warn("[auth] ENABLE_AUTH=true tapi API_KEY belum di-set. Endpoint auth: true akan menolak semua request.")
}
if (!ENABLE_AUTH) {
    console.log("[auth] Auth dinonaktifkan — semua endpoint terbuka tanpa API key.")
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

// ─── Express-style → Elysia adapter (v2: POST + body support) ────────────────
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
                    headers: {
                        "content-type": "application/json; charset=utf-8",
                        "access-control-allow-origin": "*",
                    },
                })
                return response
            },
            send(body) {
                const isBuf = Buffer.isBuffer(body)
                response = new Response(body, {
                    status,
                    headers: {
                        ...(isBuf
                            ? { "content-type": "application/octet-stream" }
                            : { "content-type": "text/html; charset=utf-8" }),
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

// ─── CORS: Allow all origins ────────────────────────────────────────────────
app.onRequest(({ set }) => {
    set.headers["access-control-allow-origin"] = "*"
    set.headers["access-control-allow-methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    set.headers["access-control-allow-headers"] = "Content-Type, x-api-key, Authorization, Accept, Origin"
})

app.options("*", ({ set }) => {
    set.status = 204
    set.headers["access-control-allow-origin"] = "*"
    set.headers["access-control-allow-methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    set.headers["access-control-allow-headers"] = "Content-Type, x-api-key, Authorization, Accept, Origin"
    set.headers["access-control-max-age"] = "86400"
    return ""
})

// ─── Swagger / OpenAPI spec generator (internal — spec served at /swagger/json) ──
app.use(
    swagger({
        // Internal path: /swagger for spec HTML (not used), /swagger/json for OpenAPI JSON
        path: "/swagger",
        documentation: {
            info: {
                title: "Kangwifi APIs",
                version: "2.0.0",
                description: `# Kangwifi APIs v2

Koleksi **142 REST API endpoint** yang siap pakai, gratis, tanpa API key.

## Kenapa Pakai API Ini?

- **Super cepat** — Dibangun di atas **Bun + Elysia**, response time sub-millisecond
- **Gratis & tanpa API key** — Langsung pakai, tidak perlu registrasi
- **142 endpoint** — AI, downloader, search, tools, Islamic, dan banyak lagi
- **Mudah dipakai** — Support **GET** (query params) dan **POST** (JSON body)

## Cara Pakai — 2 Metode

### Metode 1: GET (untuk testing cepat)
\`\`\`bash
curl "http://localhost:47291/ai/chatdeep?prompt=halo"
\`\`\`

### Metode 2: POST (RECOMMENDED — lebih mudah di HP / Hoppscotch)
\`\`\`bash
curl -X POST "http://localhost:47291/ai/chatdeep" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "halo"}'
\`\`\`

**POST lebih mudah karena:**
- Tidak perlu encode parameter di URL
- Bisa kirim prompt panjang tanpa masalah
- Format JSON lebih rapi dan gampang dibaca
- Langsung isi body di Hoppscotch / Postman tanpa ribet

## Contoh Cepat (POST)

\`\`\`bash
# Chat dengan DeepSeek AI
curl -X POST "http://localhost:47291/ai/chatdeep" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Apa itu lubang hitam?"}'

# Chat dengan Gemini AI
curl -X POST "http://localhost:47291/ai/gemini" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Siapa penemu telepon?"}'

# Chat dengan ChatGPT
curl -X POST "http://localhost:47291/ai/chatgpt" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Halo, kamu siapa?"}'

# Download TikTok video
curl -X POST "http://localhost:47291/downloader/tiktokio" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://vm.tiktok.com/xxx"}'

# BMKG data gempa terkini (tanpa parameter)
curl "http://localhost:47291/tools/gempa"
\`\`\`

## Kategori Endpoint

| Tag | Jumlah | Contoh |
|-----|--------|--------|
| **AI** | 17 | \`/ai/gemini\`, \`/ai/chatgpt\`, \`/ai/chatdeep\`, \`/ai/mistral\` |
| **Downloader** | 49 | \`/downloader/tiktokio\`, \`/downloader/savetube\` |
| **Search** | 26 | \`/search/wikipedia\`, \`/search/kbbi\` |
| **Tools** | 47 | \`/tools/qrcode\`, \`/tools/tts\` |
| **Maker** | 4 | \`/maker/brat\`, \`/maker/qc\` |
| **Islamic** | 6 | \`/islamic/quran-list\`, \`/islamic/jadwal-sholat\` |

## Autentikasi

**Tidak perlu API key!** Semua endpoint terbuka untuk umum secara default.

## Format Response

\`\`\`json
{
  "ok": true,
  "result": { ... },
  "text": "...",
  "error": "..." // hanya saat ok=false
}
\`\`\``,
            },
            components: {
                securitySchemes: {
                    ApiKeyAuth: {
                        type: "apiKey",
                        in: "header",
                        name: "x-api-key",
                    },
                },
            },
            tags: [
                {
                    name: "AI",
                    description: "Chat & text generation — Gemini, ChatGPT, Mistral, Qwen, DeepSeek, dll. Kirim prompt via GET (query) atau POST (JSON body).",
                },
                {
                    name: "Downloader",
                    description: "Media downloaders — TikTok, Instagram, YouTube, Spotify, dll. Kirim URL via GET (query) atau POST (JSON body).",
                },
                {
                    name: "Search",
                    description: "Search engines — Wikipedia, KBBI, Tokopedia, Pinterest, dll.",
                },
                {
                    name: "Tools",
                    description: "Utility tools — QR code, TTS, URL shortener, weather, gempa, translate, dll.",
                },
                {
                    name: "Maker",
                    description: "Image & text makers — brat generator, quote card, IQC.",
                },
                {
                    name: "Islamic",
                    description: "Islamic utilities — Quran, jadwal sholat, asmaul husna, doa harian, hadits.",
                },
            ],
        },
    }),
)

// ─── Custom Docs UI — Swagger UI (FastAPI-style, clean, properly configured) ──
app.get("/docs", () => {
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link type="text/css" rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
    <title>Kangwifi APIs - Swagger UI</title>
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
const ui = SwaggerUIBundle({
    url: "/swagger/json",
    dom_id: "#swagger-ui",
    presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset
    ],
    layout: "BaseLayout",
    docExpansion: "list",
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    operationsSorter: "method",
    tagsSorter: "alpha",
    persistAuthorization: true,
    deepLinking: true,
    syntaxHighlight: {
        activate: true,
        theme: "monokai"
    }
})
</script>
</body>
</html>`
    return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8", "access-control-allow-origin": "*" },
    })
})

// Convenience: /docs/json → redirect to OpenAPI spec
app.get("/docs/json", () => new Response(null, {
    status: 302,
    headers: { "location": "/swagger/json", "access-control-allow-origin": "*" },
}))

// ─── Register every feature route (GET + POST auto-registration) ─────────────
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

    // ─── Build route options (detail + hook schemas) ──────────────────────────
    // In Elysia, `detail` holds OpenAPI metadata (summary, tags, description, etc.)
    // while `query`, `params`, `body`, `response` are route hook schemas used
    // by @elysiajs/swagger to generate OpenAPI parameters & requestBody.
    // They must be passed as separate properties, NOT inside `detail`.
    const buildRouteOptions = (forPost = false) => {
        const detail = {
            tags,
            ...(summary && { summary: forPost ? `${summary} (POST)` : summary }),
            ...(description && { description }),
            ...(enforceAuth && { security: [{ ApiKeyAuth: [] }] }),
        }

        const schemas = {} // query, params, body, response — separate from detail

        // ─── Convert OpenAPI-style parameters to Elysia/TypeBox schema ────
        // The @elysiajs/swagger plugin reads hook.query / hook.params / hook.body
        // to generate OpenAPI parameters & requestBody in the spec.

        if (!forPost && parameters) {
            // Path params → hook.params (TypeBox schema)
            const pathParams = parameters.filter(p => p.in === "path")
            if (pathParams.length > 0) {
                const props = {}
                const req = []
                for (const p of pathParams) {
                    props[p.name] = { ...(p.schema || { type: "string" }) }
                    if (p.required) req.push(p.name)
                }
                schemas.params = { type: "object", properties: props, ...(req.length > 0 && { required: req }) }
            }

            // Query params → hook.query (TypeBox schema)
            const queryParams = parameters.filter(p => p.in === "query")
            if (queryParams.length > 0) {
                const props = {}
                const req = []
                for (const p of queryParams) {
                    props[p.name] = {
                        ...(p.schema || { type: "string" }),
                        ...(p.description && { description: p.description }),
                    }
                    if (p.required) req.push(p.name)
                }
                schemas.query = { type: "object", properties: props, ...(req.length > 0 && { required: req }) }
            }
        }

        if (forPost && parameters) {
            // POST body → hook.body (TypeBox schema, same params as query, in JSON body)
            const queryParams = parameters.filter(p => p.in === "query")
            const pathParams = parameters.filter(p => p.in === "path")
            const allParams = [...pathParams, ...queryParams]
            if (allParams.length > 0) {
                const props = {}
                const req = []
                for (const p of allParams) {
                    props[p.name] = {
                        ...(p.schema || { type: "string" }),
                        ...(p.description && { description: p.description }),
                    }
                    if (p.required) req.push(p.name)
                }
                schemas.body = { type: "object", properties: props, ...(req.length > 0 && { required: req }) }
            }
        }

        if (forPost && requestBody) {
            schemas.body = requestBody
        }

        if (responses) {
            schemas.response = Object.fromEntries(
                Object.entries(responses).map(([code, r]) => [
                    code,
                    r?.content?.["application/json"]?.schema ?? {},
                ]),
            )
        }

        return { detail, ...schemas }
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

    // Register original method (usually GET)
    app[verb](routePath, handler, { ...buildRouteOptions(false), ...authHook })

    // Auto-register POST for every GET endpoint
    if (verb === "get") {
        app.post(routePath, handler, { ...buildRouteOptions(true), ...authHook })
        console.log(`  [dual] ${routePath} → GET + POST`)
    }
}

// ─── Root "/" — Simple usage guide (mobile-friendly) ─────────────────────────
app.get("/", () => {
    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kangwifi APIs</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box }
body { background: #1a1a2e; color: #e0e0e0; font-family: system-ui, -apple-system, sans-serif; padding: 20px; min-height: 100vh }
.container { max-width: 800px; margin: auto }
h1 { color: #9b59b6; font-size: 2em; margin-bottom: 10px; text-align: center }
.subtitle { text-align: center; color: #888; margin-bottom: 30px; font-size: 1.1em }
.card { background: #16213e; border-radius: 12px; padding: 20px; margin-bottom: 15px; border: 1px solid #0f3460 }
.card h2 { color: #e94560; margin-bottom: 10px; font-size: 1.3em }
.card p { line-height: 1.6; margin-bottom: 8px }
.card code { background: #0f3460; padding: 2px 8px; border-radius: 4px; font-size: 0.9em; color: #53d769 }
.method-badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 0.8em; font-weight: bold; margin-right: 6px }
.method-get { background: #27ae60; color: white }
.method-post { background: #e94560; color: white }
.btn { display: inline-block; background: #9b59b6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 10px 5px; text-align: center }
.btn:hover { background: #8e44ad }
pre { background: #0f3460; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 0.85em; line-height: 1.5; margin: 10px 0 }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-top: 15px }
.grid-item { background: #0f3460; padding: 10px; border-radius: 8px; text-align: center }
.grid-item a { color: #53d769; text-decoration: none; font-size: 0.9em }
.grid-item a:hover { color: #e94560 }
.highlight { color: #53d769; font-weight: bold }
</style>
</head>
<body>
<div class="container">
<h1>Kangwifi APIs v2</h1>
<p class="subtitle">142 endpoint — Gratis, tanpa API key — Support GET + POST</p>

<div class="card">
<h2>Cara Pakai</h2>
<p>Setiap endpoint support <span class="method-badge method-get">GET</span> dan <span class="method-badge method-post">POST</span>:</p>
<p><span class="method-badge method-get">GET</span> — Parameter di URL query string (untuk testing cepat)</p>
<p><span class="method-badge method-post">POST</span> — Parameter di JSON body (RECOMMENDED, lebih mudah di HP)</p>
</div>

<div class="card">
<h2>Contoh: Chat DeepSeek AI</h2>
<p><span class="method-badge method-get">GET</span> — Testing cepat:</p>
<pre>curl "http://localhost:${PORT}/ai/chatdeep?prompt=halo"</pre>

<p><span class="method-badge method-post">POST</span> — <span class="highlight">RECOMMENDED</span> (lebih mudah di Hoppscotch/HP):</p>
<pre>curl -X POST "http://localhost:${PORT}/ai/chatdeep" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "halo"}'</pre>

<p>Di <strong>Hoppscotch / Postman</strong>: pilih method <span class="method-badge method-post">POST</span>, set Content-Type ke <code>application/json</code>, lalu isi body:</p>
<pre>{
  "prompt": "halo"
}</pre>
</div>

<div class="card">
<h2>Contoh: AI Endpoints (POST)</h2>
<pre># Gemini AI
curl -X POST "http://localhost:${PORT}/ai/gemini" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Siapa penemu telepon?"}'

# ChatGPT
curl -X POST "http://localhost:${PORT}/ai/chatgpt" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Halo, kamu siapa?"}'

# Mistral AI
curl -X POST "http://localhost:${PORT}/ai/mistral" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Apa itu AI?"}'

# DeepSeek (with thinking)
curl -X POST "http://localhost:${PORT}/ai/chatdeep" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Apa itu lubang hitam?", "thinking": true}'

# Pollinations
curl -X POST "http://localhost:${PORT}/ai/pollinations" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Apa itu fotosintesis?"}'</pre>
</div>

<div class="card">
<h2>Kategori Endpoint</h2>
<div class="grid">
<div class="grid-item"><a href="/docs">🤖 AI (17)</a></div>
<div class="grid-item"><a href="/docs">⬇️ Downloader (49)</a></div>
<div class="grid-item"><a href="/docs">🔍 Search (26)</a></div>
<div class="grid-item"><a href="/docs">🛠️ Tools (47)</a></div>
<div class="grid-item"><a href="/docs">🎨 Maker (4)</a></div>
<div class="grid-item"><a href="/docs">🕌 Islamic (6)</a></div>
</div>
</div>

<div style="text-align:center; margin-top:20px">
<a class="btn" href="/docs">Buka API Docs</a>
<a class="btn" href="/swagger/json">Download OpenAPI Spec</a>
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
        return {
            ok: false,
            error: "Endpoint tidak ditemukan",
            hint: `Coba buka /docs untuk lihat semua endpoint, atau POST ke endpoint yang benar.`,
            path,
        }
    }
    set.status = 500
    return {
        ok: false,
        error: error?.message || String(error),
        code,
    }
})

// ─── Boot ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log("")
    console.log("  Kangwifi APIs  →  Elysia + Bun edition (v2: POST + CORS)")
    console.log(`  Listen         →  http://localhost:${PORT}`)
    console.log(`  Docs (Swagger) →  http://localhost:${PORT}/docs`)
    console.log(`  Routes         →  ${features.length} endpoint (GET + POST = ${features.length * 2} total)`)
    console.log("")
})

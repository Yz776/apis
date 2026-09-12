// ============================================================================
// Kangwifi APIs — Elysia + Bun edition
// v4: Performance & Reliability Overhaul
// ============================================================================
// REST API collection on Elysia + Bun. Auto-discovery: drop a file in
// `fitur/`, restart, and the endpoint is live.
//
// v4 (2026-09-13) — faster & more reliable:
//   - Hardened global fetch layer: anti-hang timeout for every upstream call,
//     auto-retry idempotent GETs, per-host circuit breaker (fail-fast when an
//     upstream is down instead of queuing 15-30s each time)
//   - Response cache: TTL + single-flight (stampede protection) + ETag/304 for
//     GET endpoints. Opt-out per route (noCache: true) or per request
//     (?nocache=1)
//   - Handler-level timeout → 504, so no request can hang forever
//   - gzip compression for JSON/HTML/text responses
//   - x-response-time header on every response
//   - GET /health — uptime, cache stats, per-host breaker/latency states
//   - Graceful shutdown (SIGINT/SIGTERM) + uncaughtException guards
//   - Retained from v3: rate limiting, DDoS shield, /admin/sync auto-update,
//     GET+POST dual methods, CORS
// ============================================================================

import { Elysia } from "elysia"
import { swagger } from "@elysiajs/swagger"
import { readdirSync, writeFileSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath, pathToFileURL } from "url"
import { TTLCache, toCacheEntry, entryToResponse } from "./lib/cache.js"
import { installFetchEnhancers } from "./lib/fetchx.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Config ──────────────────────────────────────────────────────────────────
const ENABLE_AUTH = process.env.ENABLE_AUTH === "true"
const API_KEY = process.env.API_KEY
const PORT = Number(process.env.PORT) || 47291
const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT) || 60   // normal: requests per minute per IP
const RATE_LIMIT_BURST = Number(process.env.RATE_BURST) || 10     // normal: burst allowance
const DDOS_RATE_LIMIT = Number(process.env.DDOS_RATE_LIMIT) || 15 // production mode: stricter limit
const DDOS_BURST = Number(process.env.DDOS_BURST) || 3            // production mode: minimal burst
const SYNC_SECRET = process.env.SYNC_SECRET || "changeme"          // secret for /admin/sync
const DDOS_SPIKE_THRESHOLD = Number(process.env.DDOS_SPIKE) || 3  // spike = 3x normal traffic = DDoS signal
const DDOS_UNIQUE_IP_THRESHOLD = Number(process.env.DDOS_IPS) || 50 // >50 unique IPs in 30s = suspicious
const DDOS_COOLDOWN_MINUTES = Number(process.env.DDOS_COOLDOWN) || 5 // auto-recovery after 5 min of normal traffic

// v4 tuning knobs
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT) || 60_000   // hard cap per upstream call (when caller set no signal)
const HANDLER_TIMEOUT_MS = Number(process.env.HANDLER_TIMEOUT) || 75_000 // hard cap per feature handler → 504
const CACHE_TTL_MS = Number(process.env.CACHE_TTL) || 60_000           // GET response cache TTL
const CACHE_MAX_ENTRIES = Number(process.env.CACHE_MAX) || 400
const SLOW_LOG_MS = Number(process.env.SLOW_LOG) || 3_000              // log requests slower than this

if (ENABLE_AUTH && !API_KEY) {
    console.warn("[auth] ENABLE_AUTH=true tapi API_KEY belum di-set.")
}
if (!ENABLE_AUTH) {
    console.log("[auth] Auth dinonaktifkan — semua endpoint terbuka.")
}
console.log(`[rate-limit] Normal: ${RATE_LIMIT_PER_MIN} req/min, burst ${RATE_LIMIT_BURST}`)
console.log(`[rate-limit] DDoS Production: ${DDOS_RATE_LIMIT} req/min, burst ${DDOS_BURST}`)
console.log(`[ddos-shield] Spike threshold: ${DDOS_SPIKE_THRESHOLD}x, Unique IPs: ${DDOS_UNIQUE_IP_THRESHOLD}, Cooldown: ${DDOS_COOLDOWN_MINUTES} min)`)

// ─── v4 core: hardened fetch + axios guard + response cache ──────────────────
// Must run BEFORE feature modules are imported so every upstream call in every
// endpoint is covered (anti-hang timeout, retry, circuit breaker, metrics).
const breaker = installFetchEnhancers({ timeoutMs: FETCH_TIMEOUT_MS })
const responseCache = new TTLCache({ max: CACHE_MAX_ENTRIES, defaultTtl: CACHE_TTL_MS })

// Endpoints whose responses are random/per-user — never cache these.
const NO_CACHE_PATHS = new Set([
    "/utils/uuid", "/utils/nanoid", "/utils/password", "/utils/random-string",
    "/utils/random-bytes", "/utils/random-int", "/utils/cuid", "/utils/snowflake",
    "/info/quote", "/info/random-quotes", "/info/fact", "/info/useless-fact",
    "/info/cat-facts", "/info/dog-facts", "/info/dog-facts-v2", "/info/joke",
    "/info/bored", "/info/advice", "/info/affirmation", "/info/random",
    "/info/xkcd", "/maker/brat", "/maker/bratanim",
])

// axios is used by many feature files; give it a sane default timeout so a
// forgotten timeout can never hang a handler forever (request-level timeouts
// still override this), and wire it into the same circuit breaker + metrics
// as the hardened fetch layer via global interceptors.
try {
    const axios = (await import("axios")).default
    axios.defaults.timeout = 30_000
    axios.interceptors.request.use((config) => {
        try {
            const host = new URL(config.url, config.baseURL || "http://localhost").host
            if (host && breaker.isOpen(host)) {
                return Promise.reject(new Error(`upstream ${host} sedang tidak sehat (circuit open, coba lagi beberapa detik)`))
            }
        } catch { /* unparseable url — let axios handle it */ }
        config.metadata = { t0: performance.now() }
        return config
    })
    axios.interceptors.response.use(
        (res) => {
            try {
                const cfg = res.config
                const host = cfg ? new URL(cfg.url, cfg.baseURL || "http://localhost").host : null
                if (host) {
                    breaker.recordSuccess(host)
                    if (cfg.metadata?.t0) breaker.recordLatency(host, performance.now() - cfg.metadata.t0)
                }
            } catch { /* metrics only */ }
            return res
        },
        (err) => {
            try {
                const cfg = err?.config
                const host = cfg ? new URL(cfg.url, cfg.baseURL || "http://localhost").host : null
                if (host) {
                    if (err.response) {
                        // 5xx = upstream unhealthy; 4xx (429, 403, ...) = host alive
                        if (err.response.status >= 500) breaker.recordFailure(host, new Error(`HTTP ${err.response.status}`))
                        else breaker.recordSuccess(host)
                    } else {
                        breaker.recordFailure(host, err)
                    }
                }
            } catch { /* metrics only */ }
            // auto-retry idempotent GETs once on transient network errors
            // (no response = network/DNS flake, not an upstream verdict)
            const cfg = err?.config
            if (cfg && !err.response && !cfg.__retried && String(cfg.method || "get").toLowerCase() === "get") {
                cfg.__retried = true
                return new Promise((resolve, reject) => {
                    setTimeout(() => axios.request(cfg).then(resolve, reject), 400)
                })
            }
            return Promise.reject(err)
        },
    )
} catch { /* axios optional */ }

// ─── Rate Limiter (in-memory, per IP, dynamic limits) ──────────────────────────
class RateLimiter {
    constructor(maxPerMin, burst) {
        this.maxPerMin = maxPerMin
        this.burst = burst
        this.clients = new Map()  // ip → { tokens, lastRefill, violations }
        this.cleanupInterval = setInterval(() => this._cleanup(), 60_000)
    }

    // Dynamically adjust limits (for DDoS production mode)
    setLimits(maxPerMin, burst) {
        this.maxPerMin = maxPerMin
        this.burst = burst
        console.log(`[rate-limit] Limits updated → ${maxPerMin} req/min, burst ${burst}`)
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
            data = { tokens: this.maxPerMin + this.burst, lastRefill: now, violations: 0 }
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
        if (data.tokens <= 0) {
            data.violations = (data.violations || 0) + 1
            return false
        }
        data.tokens--
        return true
    }

    getRemaining(ip) {
        this._refill(ip)
        const data = this.clients.get(ip)
        return data ? data.tokens : this.maxPerMin + this.burst
    }

    getViolations(ip) {
        const data = this.clients.get(ip)
        return data ? data.violations || 0 : 0
    }

    getTotalClients() {
        return this.clients.size
    }

    destroy() {
        clearInterval(this.cleanupInterval)
    }
}

const limiter = new RateLimiter(RATE_LIMIT_PER_MIN, RATE_LIMIT_BURST)

// ─── Anti-DDoS Shield: Detection + Production Mode ────────────────────────────
// 3-tier protection:
//   NORMAL    → standard rate limits, basic blacklist
//   SUSPICIOUS → lowered limits, faster blacklisting
//   PRODUCTION → strictest limits, auto-auth required, aggressive blocking

const ddosShield = {
    mode: "NORMAL",                    // NORMAL | SUSPICIOUS | PRODUCTION
    modeHistory: [],                  // log mode transitions
    trafficWindow: [],                // rolling 30-second windows: { timestamp, totalRequests, uniqueIPs }
    lastModeChange: Date.now(),
    lastPrune: 0,                     // throttle for trafficWindow pruning
    blacklist: new Map(),             // ip → { blockedAt, reason, duration }
    normalBaseline: null,             // learned average request rate
    baselineSamples: [],              // for calculating baseline
    cooldownStart: null,              // timestamp when recovery cooldown started
    detectionInterval: null,          // setInterval for traffic analysis

    // Blacklist durations per mode
    getBlacklistDuration() {
        switch (this.mode) {
            case "PRODUCTION": return 30 * 60_000   // 30 minutes in production mode
            case "SUSPICIOUS": return 15 * 60_000   // 15 minutes in suspicious mode
            default: return 10 * 60_000              // 10 minutes normal
        }
    },

    // How many rate-limit violations before blacklist (mode-dependent)
    getViolationThreshold() {
        switch (this.mode) {
            case "PRODUCTION": return 1   // 1 violation = instant ban
            case "SUSPICIOUS": return 2   // 2 violations = ban
            default: return 3              // 3 violations = ban (lenient)
        }
    },

    isBlacklisted(ip) {
        const entry = this.blacklist.get(ip)
        if (!entry) return false
        const duration = entry.duration || this.getBlacklistDuration()
        if (Date.now() - entry.blockedAt > duration) {
            this.blacklist.delete(ip)
            return false
        }
        return true
    },

    blacklistIP(ip, reason) {
        const duration = this.getBlacklistDuration()
        this.blacklist.set(ip, { blockedAt: Date.now(), reason, duration })
        console.warn(`[ddos-${this.mode}] IP ${ip} blacklisted for ${duration / 60_000} min: ${reason}`)
    },

    // ── Traffic Monitoring ──
    recordRequest(ip) {
        const now = Date.now()
        const windowStart = now - (now % 30_000)  // align to 30-second windows

        // Find or create current window (fast path: check the newest window first)
        let window = this.trafficWindow[this.trafficWindow.length - 1]
        if (!window || window.timestamp !== windowStart) {
            window = this.trafficWindow.find(w => w.timestamp === windowStart)
            if (!window) {
                window = { timestamp: windowStart, totalRequests: 0, uniqueIPs: new Set() }
                this.trafficWindow.push(window)
            }
        }
        window.totalRequests++
        window.uniqueIPs.add(ip)

        // Prune old windows (keep last 5 minutes = 10 windows) — cheap periodic
        // sweep instead of an array filter() on every request
        if (now - this.lastPrune > 15_000) {
            this.lastPrune = now
            this.trafficWindow = this.trafficWindow.filter(w => now - w.timestamp < 300_000)
        }

        // Learn baseline (first 5 minutes)
        if (!this.normalBaseline && this.trafficWindow.length >= 10) {
            const avgReq = this.trafficWindow.reduce((s, w) => s + w.totalRequests, 0) / this.trafficWindow.length
            this.normalBaseline = avgReq
            console.log(`[ddos-shield] Baseline learned: ~${avgReq.toFixed(1)} req per 30s window`)
        }
    },

    // ── DDoS Detection Engine ──
    detectDDoS() {
        if (this.trafficWindow.length < 2) return false

        const now = Date.now()
        const recentWindows = this.trafficWindow.filter(w => now - w.timestamp < 60_000)  // last 2 windows (60s)
        if (recentWindows.length === 0) return false

        const currentRate = recentWindows.reduce((s, w) => s + w.totalRequests, 0)
        const currentUniqueIPs = new Set()
        for (const w of recentWindows) for (const ip of w.uniqueIPs) currentUniqueIPs.add(ip)

        // Detection signals:
        const signals = []

        // Signal 1: Traffic spike (>3x baseline)
        if (this.normalBaseline) {
            const avgRecent = currentRate / recentWindows.length
            if (avgRecent > this.normalBaseline * DDOS_SPIKE_THRESHOLD) {
                signals.push(`Spike: ${avgRecent.toFixed(1)} req/30s vs baseline ${this.normalBaseline.toFixed(1)} (${(avgRecent / this.normalBaseline).toFixed(1)}x)`)
            }
        }

        // Signal 2: Sudden influx of unique IPs (>50 in 60s)
        if (currentUniqueIPs.size > DDOS_UNIQUE_IP_THRESHOLD) {
            signals.push(`Unique IPs spike: ${currentUniqueIPs.size} in 60s`)
        }

        // Signal 3: Many IPs hitting rate limits simultaneously
        let recentViolators = 0
        for (const [ip, data] of limiter.clients) {
            if ((data.violations || 0) > 0) recentViolators++
        }
        if (recentViolators > 10) {
            signals.push(`Mass violations: ${recentViolators} IPs exceeding rate limit`)
        }

        // Signal 4: Blacklist growing rapidly
        if (this.blacklist.size > 20) {
            signals.push(`Blacklist size: ${this.blacklist.size} IPs`)
        }

        // Decision logic
        if (signals.length >= 2) {
            // 2+ signals = DDoS detected → PRODUCTION mode
            this.switchMode("PRODUCTION", signals.join("; "))
            return true
        } else if (signals.length === 1) {
            // 1 signal = suspicious → SUSPICIOUS mode
            if (this.mode === "NORMAL") {
                this.switchMode("SUSPICIOUS", signals[0])
            }
            return false
        }

        // No signals → check if we can recover from SUSPICIOUS/PRODUCTION
        if (this.mode !== "NORMAL") {
            if (!this.cooldownStart) {
                this.cooldownStart = now
            }
            const cooldownElapsed = now - this.cooldownStart
            if (cooldownElapsed >= DDOS_COOLDOWN_MINUTES * 60_000) {
                this.switchMode("NORMAL", "Cooldown complete — traffic normal")
                this.cooldownStart = null
            }
        }

        return false
    },

    // ── Mode Switching ──
    switchMode(newMode, reason) {
        const oldMode = this.mode
        if (oldMode === newMode) return

        this.mode = newMode
        this.lastModeChange = Date.now()
        this.cooldownStart = null  // reset cooldown on mode change

        const timestamp = new Date().toISOString()
        this.modeHistory.push({ timestamp, from: oldMode, to: newMode, reason })

        // Keep history manageable
        if (this.modeHistory.length > 50) this.modeHistory = this.modeHistory.slice(-25)

        console.warn(`[ddos-shield] Mode: ${oldMode} → ${newMode} | Reason: ${reason}`)

        // Apply mode-specific rate limits
        switch (newMode) {
            case "NORMAL":
                limiter.setLimits(RATE_LIMIT_PER_MIN, RATE_LIMIT_BURST)
                break
            case "SUSPICIOUS":
                limiter.setLimits(Math.floor(RATE_LIMIT_PER_MIN / 2), Math.floor(RATE_LIMIT_BURST / 2))
                break
            case "PRODUCTION":
                limiter.setLimits(DDOS_RATE_LIMIT, DDOS_BURST)
                // Clear all client tokens to force re-check under new stricter limits
                for (const [ip, data] of limiter.clients) {
                    data.tokens = Math.min(data.tokens, DDOS_RATE_LIMIT + DDOS_BURST)
                }
                break
        }
    },

    // ── Auto-analyze traffic every 30 seconds ──
    startDetection() {
        this.detectionInterval = setInterval(() => {
            this.detectDDoS()
        }, 30_000)
        console.log("[ddos-shield] Detection engine started (30s interval)")
    },

    stopDetection() {
        if (this.detectionInterval) clearInterval(this.detectionInterval)
    },

    // ── Status report for /admin/ddos-status ──
    getStatus() {
        const now = Date.now()
        const recentWindows = this.trafficWindow.filter(w => now - w.timestamp < 120_000)
        const currentRate = recentWindows.reduce((s, w) => s + w.totalRequests, 0)
        const currentUniqueIPs = new Set()
        for (const w of recentWindows) for (const ip of w.uniqueIPs) currentUniqueIPs.add(ip)

        return {
            mode: this.mode,
            modeHistory: this.modeHistory.slice(-10),
            currentTraffic: {
                requestsLast2Min: currentRate,
                uniqueIPsLast2Min: currentUniqueIPs.size,
                baseline: this.normalBaseline,
                activeClients: limiter.getTotalClients(),
                blacklistSize: this.blacklist.size,
            },
            limits: {
                normal: { rateLimit: RATE_LIMIT_PER_MIN, burst: RATE_LIMIT_BURST },
                production: { rateLimit: DDOS_RATE_LIMIT, burst: DDOS_BURST },
                current: { rateLimit: limiter.maxPerMin, burst: limiter.burst },
            },
            cooldownRemaining: this.cooldownStart
                ? Math.max(0, DDOS_COOLDOWN_MINUTES * 60_000 - (now - this.cooldownStart)) / 1000
                : null,
            lastModeChange: this.lastModeChange,
            violationThreshold: this.getViolationThreshold(),
        }
    },
}

// Start detection engine
ddosShield.startDetection()

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
    const routeTimeout = Number(feature.route?.timeout) || HANDLER_TIMEOUT_MS
    return async (c) => {
        let status = 200
        let response = null
        let timedOut = false
        const extraHeaders = {}
        const t0 = performance.now()

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
            // Express-compatible header setters
            set(name, value) {
                if (typeof name === 'object') Object.assign(extraHeaders, name)
                else extraHeaders[String(name).toLowerCase()] = value
                return this
            },
            header(name, value) { return this.set(name, value) },
            type(value) { extraHeaders['content-type'] = value; return this },
            json(obj) {
                if (timedOut) return null // client already got the 504 — drop late writes
                response = new Response(JSON.stringify(obj), {
                    status,
                    headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", ...extraHeaders },
                })
                return response
            },
            send(body) {
                if (timedOut) return null
                const isBuf = Buffer.isBuffer(body)
                const headers = {
                    ...(isBuf ? { "content-type": "application/octet-stream" } : { "content-type": "text/html; charset=utf-8" }),
                    "access-control-allow-origin": "*",
                    ...extraHeaders,
                }
                response = new Response(body, { status, headers })
                return response
            },
            end(body) {
                if (timedOut) return null
                response = new Response(body ?? null, {
                    status,
                    headers: { "access-control-allow-origin": "*", ...extraHeaders },
                })
                return response
            },
        }

        try {
            const work = run(req, res)
            let guardResolve
            const guard = new Promise(resolve => {
                const t = setTimeout(() => { timedOut = true; guardResolve() }, routeTimeout)
                t.unref?.() // never keep the process alive just for this timer
                guardResolve = resolve
            })
            await Promise.race([work, guard])
            const ms = performance.now() - t0
            if (timedOut && !response) {
                const u = new URL(c.request.url)
                console.warn(`[timeout] ${c.request.method} ${u.pathname}${u.search} exceeded ${routeTimeout}ms → 504`)
                return new Response(
                    JSON.stringify({ ok: false, error: `Handler timeout setelah ${Math.round(routeTimeout / 1000)}s — upstream terlalu lambat/stuck. Coba lagi atau pakai endpoint alternatif.` }),
                    { status: 504, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" } },
                )
            }
            if (ms > SLOW_LOG_MS) {
                console.warn(`[slow] ${ms.toFixed(0)}ms ${c.request.method} ${new URL(c.request.url).pathname}`)
            }
            if (response) return response
            return new Response(null, { status, headers: { "access-control-allow-origin": "*", ...extraHeaders } })
        } catch (e) {
            const ms = performance.now() - t0
            const u = new URL(c.request.url)
            console.error(`[error] ${ms.toFixed(0)}ms ${c.request.method} ${u.pathname}${u.search} :: ${e?.message || e}`)
            return new Response(
                JSON.stringify({ ok: false, error: e?.message || String(e) }),
                { status: 500, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" } },
            )
        }
    }
}

// ─── GET response cache wrapper (TTL + single-flight + ETag) ─────────────────
function withCache(feature, handler) {
    return async (c) => {
        const url = new URL(c.request.url)
        const bypass = url.searchParams.has("nocache")
            || (c.headers["cache-control"] || "").includes("no-cache")
        const key = TTLCache.buildKey("GET", c.request.url)

        if (bypass) {
            responseCache.stats.bypassed++
            return handler(c)
        }

        const cached = responseCache.get(key)
        if (cached) {
            const inm = c.headers["if-none-match"]
            if (inm && inm === cached.etag) {
                return new Response(null, { status: 304, headers: { etag: cached.etag, "x-cache": "HIT" } })
            }
            return entryToResponse(cached, { hit: true })
        }

        // single-flight: collapse identical concurrent misses into ONE handler run
        const { store, raw } = await responseCache.singleFlight(key, async () => {
            const res = await handler(c)
            if (!(res instanceof Response)) return { store: null, raw: res }
            const out = await toCacheEntry(res, responseCache)
            responseCache.stats.misses++
            if (out.store) responseCache.set(key, out.store)
            return out
        })

        if (store) return entryToResponse(store, { hit: false })
        return raw // not cacheable (binary/stream/error) — return the original response
    }
}

// ─── Build the Elysia app ────────────────────────────────────────────────────
const app = new Elysia()

// v4: gzip compression for compressible responses + x-response-time header.
// Runs after the handler; returns a transformed Response when beneficial.
const reqTiming = new WeakMap() // Request → t0 (performance.now)
app.onAfterHandle(async ({ request, response }) => {
    if (!(response instanceof Response)) return
    const status = response.status
    if (status === 304 || status === 204) return response

    // x-response-time (set from the t0 recorded in onRequest)
    const t0 = reqTiming.get(request)
    const headers = new Headers(response.headers)
    if (t0) headers.set("x-response-time", `${(performance.now() - t0).toFixed(1)}ms`)

    const ct = headers.get("content-type") || ""
    const compressible = /^(application\/(json|javascript|xml)|text\/|image\/svg)/i.test(ct)
    const accepts = /gzip/.test(request.headers.get("accept-encoding") || "")
    if (!compressible || !accepts) return new Response(response.body, { status, headers })

    const buf = Buffer.from(await response.arrayBuffer())
    if (buf.length < 1024) return new Response(buf, { status, headers }) // not worth it
    const gz = Buffer.from(await new Response(new Blob([buf]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer())
    headers.delete("content-length")
    headers.set("content-encoding", "gzip")
    headers.append("vary", "Accept-Encoding")
    return new Response(gz, { status, headers })
})

// ─── Rate Limit + DDoS Shield middleware ───────────────────────────────────────
app.onRequest(({ request, set }) => {
    reqTiming.set(request, performance.now())
    set.headers["access-control-allow-origin"] = "*"
    set.headers["access-control-allow-methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    set.headers["access-control-allow-headers"] = "Content-Type, x-api-key, Authorization, Accept, Origin"

    // /health is exempt: uptime monitors must never be rate-limited or count as traffic
    if (new URL(request.url).pathname === "/health") return

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || request.headers.get("x-real-ip")
        || "unknown"

    // 1. Record traffic for DDoS detection
    ddosShield.recordRequest(ip)

    // 2. Check blacklist first (mode-aware)
    if (ddosShield.isBlacklisted(ip)) {
        set.status = 403
        set.headers["x-ddos-mode"] = ddosShield.mode
        return new Response(
            JSON.stringify({ ok: false, error: `IP diblokir karena abuse (mode: ${ddosShield.mode}). Coba lagi nanti.`, ddosMode: ddosShield.mode }),
            { status: 403, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" } },
        )
    }

    // 3. Rate limit check (limits auto-adjust based on DDoS mode)
    if (!limiter.check(ip)) {
        // Blacklist if they violate more than threshold (mode-dependent: 1 in PRODUCTION, 2 in SUSPICIOUS, 3 in NORMAL)
        if (limiter.getViolations(ip) >= ddosShield.getViolationThreshold()) {
            ddosShield.blacklistIP(ip, "Rate limit exceeded repeatedly")
        }
        set.status = 429
        set.headers["retry-after"] = "60"
        set.headers["x-ddos-mode"] = ddosShield.mode
        return new Response(
            JSON.stringify({ ok: false, error: "Rate limit exceeded. Coba lagi dalam 1 menit.", retryAfter: 60, ddosMode: ddosShield.mode }),
            { status: 429, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "retry-after": "60" } },
        )
    }

    // 4. In PRODUCTION mode: require auth for ALL endpoints temporarily
    if (ddosShield.mode === "PRODUCTION" && ENABLE_AUTH && API_KEY) {
        const apiKey = request.headers.get("x-api-key")
        if (!apiKey || apiKey !== API_KEY) {
            set.status = 401
            set.headers["x-ddos-mode"] = "PRODUCTION"
            return new Response(
                JSON.stringify({ ok: false, error: "DDoS Production Mode aktif — semua request harus pakai API key (x-api-key header).", ddosMode: "PRODUCTION" }),
                { status: 401, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" } },
            )
        }
    }

    // 5. Add rate limit + DDoS mode info headers
    set.headers["x-ratelimit-limit"] = String(limiter.maxPerMin)
    set.headers["x-ratelimit-remaining"] = String(limiter.getRemaining(ip))
    set.headers["x-ddos-mode"] = ddosShield.mode
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

    const baseHandler = adapt(f)
    // v4: cache GET responses (opt-out via route.noCache: true or the NO_CACHE_PATHS set)
    const cacheable = verb === "get" && !f.route.noCache && !NO_CACHE_PATHS.has(routePath)
    const handler = cacheable ? withCache(f, baseHandler) : baseHandler
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
.shield { text-align: center; padding: 8px; border-radius: 8px; margin-bottom: 15px; font-weight: bold }
.shield.normal { background: #1b5e20; color: #a5d6a7 }
.shield.suspicious { background: #e65100; color: #ffcc80 }
.shield.production { background: #b71c1c; color: #ef9a9a }
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

<div class="shield ${ddosShield.mode.toLowerCase()}">DDoS Shield: ${ddosShield.mode} — ${ddosShield.mode === "NORMAL" ? "Aman" : ddosShield.mode === "SUSPICIOUS" ? "Perhatian" : "Produksi (Strict)"}</div>

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

// ─── Admin: DDoS Shield Status ────────────────────────────────────────────────
app.get("/admin/ddos-status", ({ request, set }) => {
    const secret = request.headers.get("x-sync-secret")
    if (secret !== SYNC_SECRET) {
        set.status = 401
        set.headers["access-control-allow-origin"] = "*"
        return { ok: false, error: "Secret tidak valid (header: x-sync-secret)" }
    }
    set.headers["access-control-allow-origin"] = "*"
    return ddosShield.getStatus()
})

// ─── Admin: Manual DDoS Mode Control ──────────────────────────────────────────
app.post("/admin/ddos-mode", ({ request, body, set }) => {
    const secret = request.headers.get("x-sync-secret")
    if (secret !== SYNC_SECRET) {
        set.status = 401
        set.headers["access-control-allow-origin"] = "*"
        return { ok: false, error: "Secret tidak valid (header: x-sync-secret)" }
    }
    const newMode = body?.mode
    if (!newMode || !["NORMAL", "SUSPICIOUS", "PRODUCTION"].includes(newMode)) {
        set.status = 400
        set.headers["access-control-allow-origin"] = "*"
        return { ok: false, error: "Mode harus NORMAL, SUSPICIOUS, atau PRODUCTION" }
    }
    ddosShield.switchMode(newMode, `Manual override by admin`)
    set.headers["access-control-allow-origin"] = "*"
    return { ok: true, mode: ddosShield.mode, message: `DDoS Shield switched to ${newMode}` }
})

// ─── Public: DDoS Shield mode (read-only, no secret needed) ───────────────────
app.get("/ddos-mode", ({ set }) => {
    set.headers["access-control-allow-origin"] = "*"
    return { mode: ddosShield.mode, limits: { rateLimit: limiter.maxPerMin, burst: limiter.burst }, violationThreshold: ddosShield.getViolationThreshold() }
})

// ─── GET /health — liveness + observability (no rate limit, no auth) ─────────
const BOOT_TIME = Date.now()
app.get("/health", ({ set }) => {
    set.headers["access-control-allow-origin"] = "*"
    const mem = process.memoryUsage()
    return {
        ok: true,
        uptime_s: Math.round((Date.now() - BOOT_TIME) / 1000),
        endpoints: features.length,
        ddosMode: ddosShield.mode,
        memory: { rssMb: +(mem.rss / 1e6).toFixed(1), heapMb: +(mem.heapUsed / 1e6).toFixed(1) },
        cache: responseCache.statsSnapshot(),
        breaker: { open: Object.values(breaker.snapshot()).filter(h => h.state !== "closed").length, hosts: breaker.snapshot() },
    }
})

// ─── 404 / 500 ────────────────────────────────────────────────────────────────
app.onError(({ code, error, path, set }) => {
    set.headers["access-control-allow-origin"] = "*"
    if (code === "NOT_FOUND") {
        set.status = 404
        return { ok: false, error: "Endpoint tidak ditemukan", hint: "Coba buka /docs", path }
    }
    set.status = 500
    return { ok: false, error: error?.message || String(error), code }
})

// ─── Process guards: one bad async handler must never kill the server ────────
process.on("uncaughtException", (e) => {
    console.error("[uncaughtException]", e?.message || e)
})
process.on("unhandledRejection", (e) => {
    console.error("[unhandledRejection]", e?.message || e)
})

// ─── Graceful shutdown (SIGINT/SIGTERM): stop accepting, drain, exit ─────────
let server
function shutdown(signal) {
    console.log(`\n[shutdown] ${signal} diterima — mematikan dengan rapi...`)
    try { server?.stop(true) } catch { /* already closed */ }
    limiter.destroy()
    ddosShield.stopDetection()
    process.exit(0)
}
process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))

// ─── Boot ────────────────────────────────────────────────────────────────────
server = app.listen(PORT, () => {
    console.log("")
    console.log("  Kangwifi APIs  →  Elysia + Bun v4 (Cache + Circuit Breaker + DDoS Shield)")
    console.log(`  Listen         →  http://localhost:${PORT}`)
    console.log(`  Docs           →  http://localhost:${PORT}/docs`)
    console.log(`  Health         →  http://localhost:${PORT}/health`)
    console.log(`  Rate Limit     →  ${RATE_LIMIT_PER_MIN} req/min per IP (normal)`)
    console.log(`  DDoS Shield    →  ${ddosShield.mode} mode`)
    console.log(`  Cache          →  TTL ${CACHE_TTL_MS / 1000}s, max ${CACHE_MAX_ENTRIES} entries`)
    console.log(`  Timeouts       →  fetch ${FETCH_TIMEOUT_MS / 1000}s, handler ${HANDLER_TIMEOUT_MS / 1000}s`)
    console.log(`  Routes         →  ${features.length} endpoint`)
    console.log("")
})

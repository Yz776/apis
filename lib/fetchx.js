// lib/fetchx.js — hardened global fetch layer.
//
// Every feature file calls bare `fetch()`. Installing this wrapper BEFORE the
// feature modules run gives the whole API (without touching 296 files):
//
//   1. Anti-hang guard     — a per-call timeout (default 60s) whenever the
//                            caller did not pass its own AbortSignal, so a
//                            stuck upstream can never hold a request forever.
//   2. Auto-retry          — idempotent GET/HEAD retried once after 400ms on
//                            transient network errors (socket reset, timeout).
//   3. Circuit breaker     — per-host. 6 consecutive failures (network error
//                            or HTTP 5xx) open the circuit for 30s; requests
//                            then fail in <1ms instead of queuing into a dead
//                            upstream. After the cooldown one probe request is
//                            let through (half-open); success closes it again.
//   4. Per-host metrics    — request/error counters + rolling latency, served
//                            by /health.

const BREAKER_THRESHOLD = 6      // consecutive failures before opening
const BREAKER_COOLDOWN = 30_000  // open duration before a half-open probe
const RETRY_DELAY = 400
const MAX_LATENCY_SAMPLES = 20

export class Breaker {
    constructor({ threshold = BREAKER_THRESHOLD, cooldown = BREAKER_COOLDOWN } = {}) {
        this.threshold = threshold
        this.cooldown = cooldown
        this.hosts = new Map() // host → state
    }

    _host(h) {
        let s = this.hosts.get(h)
        if (!s) {
            s = { state: "closed", fails: 0, openedAt: 0, count: 0, errors: 0, latSum: 0, latN: 0, latMax: 0, lastError: null }
            this.hosts.set(h, s)
        }
        return s
    }

    isOpen(host) {
        const s = this.hosts.get(host)
        if (!s || s.state === "closed") return false
        if (s.state === "open") {
            if (Date.now() - s.openedAt >= this.cooldown) s.state = "half-open"
            else return true
        }
        return false // half-open lets a probe through
    }

    recordSuccess(host) {
        const s = this._host(host)
        s.state = "closed"
        s.fails = 0
        s.count++
        // latency metrics are recorded separately in the fetch wrapper
    }

    recordLatency(host, ms) {
        const s = this._host(host)
        s.latSum += ms
        s.latN++
        if (ms > s.latMax) s.latMax = ms
        if (s.latN > MAX_LATENCY_SAMPLES) { s.latSum *= 0.9; s.latN = Math.ceil(s.latN * 0.9) }
    }

    // Only open a circuit for a host that has PROVEN itself (≥1 successful
    // request) before failing. A host that has never succeeded may just be a
    // transient DNS/routing flake — opening it would turn a hiccup into a
    // guaranteed outage.
    recordFailure(host, err) {
        const s = this._host(host)
        s.errors++
        if (s.count === 0) return // never-succeeded: don't trip the breaker
        s.fails++
        s.lastError = String(err?.message || err).slice(0, 120)
        if (s.fails >= this.threshold && s.state !== "open") {
            s.state = "open"
            s.openedAt = Date.now()
        }
    }

    snapshot() {
        const out = {}
        for (const [host, s] of this.hosts) {
            if (!s.count && !s.errors) continue
            out[host] = {
                state: s.state,
                requests: s.count,
                errors: s.errors,
                avgMs: s.latN ? Math.round(s.latSum / s.latN) : null,
                maxMs: s.latMax || null,
                consecutiveFails: s.fails,
                lastError: s.state === "closed" ? undefined : s.lastError,
            }
        }
        return out
    }
}

function isTransientNetworkError(e) {
    const msg = String(e?.message || e)
    return /fetch failed|socket|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|aborted|timeout|terminated|UND_ERR/i.test(msg)
}

export function installFetchEnhancers({ timeoutMs = 60_000, breaker = new Breaker() } = {}) {
    const raw = globalThis.fetch

    const hardened = async (input, init = {}) => {
        let url = ""
        try {
            url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
        } catch { /* leave blank — raw fetch will produce its own error */ }

        let host = null
        try { host = url ? new URL(url).host : null } catch { /* relative URL etc. */ }
        if (host && breaker.isOpen(host)) {
            const err = new Error(`upstream ${host} sedang tidak sehat (circuit open, coba lagi beberapa detik)`)
            err.code = "CIRCUIT_OPEN"
            throw err
        }

        const method = String(init.method || (typeof input === "object" && input?.method) || "GET").toUpperCase()
        const callerHasSignal = init.signal !== undefined && init.signal !== null

        const attempt = async () => {
            let timer
            let ac
            let effectiveInit = init
            if (!callerHasSignal) {
                ac = new AbortController()
                timer = setTimeout(() => ac.abort(new Error(`upstream timeout (${timeoutMs}ms)`)), timeoutMs)
                effectiveInit = { ...init, signal: ac.signal }
            }
            const t0 = performance.now()
            try {
                return await raw(input, effectiveInit)
            } finally {
                if (timer) clearTimeout(timer)
                if (host) {
                    const ms = performance.now() - t0
                    const s = breaker._host(host)
                    s.latSum += ms
                    s.latN++
                    if (ms > s.latMax) s.latMax = ms
                    if (s.latN > MAX_LATENCY_SAMPLES) { s.latSum *= 0.9; s.latN = Math.ceil(s.latN * 0.9) } // decayed rolling avg
                }
            }
        }

        let res
        try {
            res = await attempt()
        } catch (e) {
            if (host) breaker.recordFailure(host, e)
            // one automatic retry for idempotent, signal-less GET/HEAD
            const callerAborted = callerHasSignal && init.signal?.aborted
            if (!callerAborted && (method === "GET" || method === "HEAD") && isTransientNetworkError(e)) {
                await new Promise(r => setTimeout(r, RETRY_DELAY))
                try {
                    res = await attempt()
                } catch (e2) {
                    if (host) breaker.recordFailure(host, e2)
                    throw e2
                }
            } else {
                throw e
            }
        }

        if (host) {
            if (res.status >= 500) breaker.recordFailure(host, new Error(`HTTP ${res.status} from ${url.slice(0, 80)}`))
            else breaker.recordSuccess(host) // resets fail streak; latency already recorded in attempt()
        }
        return res
    }

    // keep a reference for diagnostics / testing
    hardened.__raw = raw
    globalThis.fetch = hardened
    return breaker
}

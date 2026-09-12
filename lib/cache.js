// lib/cache.js — in-memory TTL response cache with single-flight + ETag.
//
// Purpose: repeat GET requests (the dominant traffic pattern for an API
// collection) must be answered from memory in microseconds instead of
// re-hitting slow upstreams. Identical concurrent requests are collapsed into
// one upstream call (single-flight / stampede protection).
//
// Only safe responses are stored: 2xx and 404, uncompressed bodies below
// MAX_BODY_BYTES, and never anything carrying Set-Cookie. Endpoints can opt
// out with `noCache: true` in their route meta; clients can bypass with
// ?nocache=1.

import { createHash } from "crypto"

const MAX_BODY_BYTES = 1_500_000

export class TTLCache {
    constructor({ max = 300, defaultTtl = 60_000 } = {}) {
        this.max = max
        this.defaultTtl = defaultTtl
        this.map = new Map()      // key → { expiresAt, status, headers, buf, etag }
        this.inFlight = new Map() // key → Promise<entry|null>
        this.stats = { hits: 0, misses: 0, bypassed: 0, stores: 0, evicted: 0, inflightJoined: 0 }
    }

    static buildKey(method, url) {
        const u = new URL(url)
        const params = [...u.searchParams.entries()]
            .filter(([k]) => k !== "nocache" && k !== "_") // bypass flags never change the key
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        const qs = params.map(([k, v]) => `${k}=${v}`).join("&")
        return `${method} ${u.pathname}${qs ? "?" + qs : ""}`
    }

    get(key) {
        const e = this.map.get(key)
        if (!e) return null
        if (Date.now() > e.expiresAt) {
            this.map.delete(key)
            return null
        }
        // LRU touch: re-insert so Map iteration order = recency
        this.map.delete(key)
        this.map.set(key, e)
        this.stats.hits++
        return e
    }

    set(key, entry, ttl = this.defaultTtl) {
        if (this.map.size >= this.max) {
            // evict oldest (Map iteration order = oldest first)
            const oldest = this.map.keys().next().value
            this.map.delete(oldest)
            this.stats.evicted++
        }
        entry.expiresAt = Date.now() + ttl
        this.map.set(key, entry)
        this.stats.stores++
        return entry
    }

    // Collapse concurrent identical requests into one upstream call.
    async singleFlight(key, loader) {
        const p = this.inFlight.get(key)
        if (p) {
            this.stats.inflightJoined++
            return p
        }
        const promise = (async () => {
            try {
                return await loader()
            } finally {
                this.inFlight.delete(key)
            }
        })()
        this.inFlight.set(key, promise)
        return promise
    }

    etag(buf) {
        return `"${createHash("sha1").update(buf).digest("hex").slice(0, 16)}"`
    }

    statsSnapshot() {
        const total = this.stats.hits + this.stats.misses
        return {
            ...this.stats,
            size: this.map.size,
            max: this.max,
            hitRate: total ? +(this.stats.hits / total * 100).toFixed(1) + "%" : "0%",
        }
    }
}

// Read a handler Response and decide whether it's cacheable.
// Always returns { store, raw } where `raw` is a usable Response (rebuilt from
// the buffer when we already consumed the stream) — so callers never end up
// with a dead, already-read body.
export async function toCacheEntry(res, cache) {
    let raw = res
    try {
        const status = res.status
        const headers = {}
        let cacheableHeader = true
        res.headers.forEach((v, k) => {
            const lk = k.toLowerCase()
            if (lk === "set-cookie") { cacheableHeader = false; return }
            if (["content-length", "transfer-encoding", "content-encoding", "etag", "date", "x-cache", "x-response-time"].includes(lk)) return
            headers[lk] = v
        })
        const buf = Buffer.from(await res.arrayBuffer())
        // rebuild a fresh Response from the buffer — the original body is spent
        raw = new Response(buf, { status, headers: res.headers })

        const ct = headers["content-type"] || ""
        const okType = /^(application\/(json|javascript|xml)|text\/|image\/|font\/|application\/octet-stream)/i.test(ct)
        const cacheable = status < 500 && status !== 429 && cacheableHeader && okType && buf.length <= MAX_BODY_BYTES
        if (!cacheable) return { store: null, raw }

        return { store: { status, headers, buf, etag: cache.etag(buf) }, raw }
    } catch {
        return { store: null, raw }
    }
}

export function entryToResponse(entry, { hit }) {
    return new Response(entry.buf, {
        status: entry.status,
        headers: {
            ...entry.headers,
            etag: entry.etag,
            "x-cache": hit ? "HIT" : "MISS",
        },
    })
}

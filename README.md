# Kangwifi APIs v4

> High-performance REST API collection built on **Elysia + Bun**. **296+ endpoints**, Swagger docs, no API key required. **All endpoints use GET with query params** (v4.1 — POST removed).

![Bun](https://img.shields.io/badge/Bun-1.3+-000000?logo=bun&logoColor=white)
![Elysia](https://img.shields.io/badge/Elysia-1.x-00eggf?logo=elysia&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-blue)
![Endpoints](https://img.shields.io/badge/endpoints-296-success)
![GET](https://img.shields.io/badge/GET-only-9b59b6)

---

## What's New — v4 Performance & Reliability Overhaul (2026-09-13)

The server core was rebuilt for speed and resilience — **without touching the 296 endpoint files**:

- **Hardened global fetch layer** (`lib/fetchx.js`) — every upstream call made through `fetch` or `axios` (wired via interceptors) now gets:
  - anti-hang timeout (60s default, per-call) so no upstream can hold a request forever,
  - automatic retry for idempotent GETs on transient network errors (socket reset, DNS flake),
  - a **per-host circuit breaker**: a host that proved healthy then fails 6× in a row is skipped for 30s (requests fail in <1 ms with a clear error instead of queuing 15–30 s each), then one probe request checks recovery. Hosts that never succeeded are never tripped (transient DNS flakes can't cascade).
- **Response cache** (`lib/cache.js`) for GET — 60 s TTL, LRU cap 400 entries, **single-flight** (N identical concurrent requests = 1 upstream call), `ETag`/`If-None-Match` → 304. Repeat requests: **10 100 ms → 0.4 ms**. Opt out per route (`noCache: true` in route meta) or per request (`?nocache=1`). Random-output endpoints (uuid, quotes, facts, …) are auto-excluded.
- **Handler timeout → 504** — any endpoint that hangs returns a clean 504 after 75 s (overridable per route via `timeout: <ms>`; `/downloader/cnv` and `/ai/pollinations` use longer limits).
- **gzip compression** for JSON/HTML/text responses >1 KB (5000 B → 138 B on base64 payloads).
- **`x-response-time` header** on every response; slow (>3 s) and failed requests logged server-side.
- **`GET /health`** — uptime, memory, cache hit-rate stats, per-host latency & breaker states. Exempt from rate limiting so uptime monitors never get 429.
- **Graceful shutdown** (SIGINT/SIGTERM drains connections) + `uncaughtException`/`unhandledRejection` guards so one bad async handler can never kill the process.
- **`ecosystem.config.cjs`** for PM2 (auto-restart with exponential backoff, 600 MB memory cap) — `pm2 start ecosystem.config.cjs`.
- DDoS-shield traffic accounting optimized (window pruning every 15 s instead of an array `filter()` on every request).

## What's New — Full endpoint audit & maintenance (2026-09-12)

All 296 endpoints were live-tested against their real upstreams and fixed until green:

- **Fixed bugs**: `/downloader/cnv` (cnv.cx now needs the YouTube video ID on the key call), `/info/dns` (multi-resolver DoH fallback: Google → AliDNS → Quad9 → Cloudflare, so a poisoned router DNS no longer breaks it), `/tools/sekolah` (Bun-fetch-first after the Dapodik WAF flipped to blocking curl), `/tools/uploader` (postimages.org went behind a JS challenge → rewritten on uguu.se), plus raised timeouts on `/info/dictionary`, `/downloader/spotidown` and 429-retry hardening on `/info/{genderize,agify,nationalize}` and a 5× retry on `/downloader/pindown`.
- **Removed 13 endpoints** whose upstreams are dead or permanently bot-blocked and cannot be driven server-side: `/ai/{chatdeep,copilot,quillbotai,deepsek-ai}`, `/search/{apkmodysearch,groupsor,nhentai}`, `/downloader/spotitrack`, `/anime/seegore`, `/tools/{photiu-upscale,wink-enhancer,unggah,uploader-postimages-org}`.
- **Added 3 new working endpoints**: `/ai/pollinations` (AI image generation via Pollinations FLUX — no key), `/search/wikipedia` (MediaWiki search, any language), `/search/appstore` (Apple iTunes Search).
- `endpoints.json` and `swagger.json` were regenerated from the live server, clearing 16 stale doc entries that pointed at files which no longer exist.

## What's New in v2

- **~~POST support~~** — *removed in v4.1: all endpoints are GET-only now.*
- **CORS headers** — All responses include `Access-Control-Allow-Origin: *`. Works in browsers, mobile apps, and cross-origin requests.
- **~~Smart parameter merging~~** — *removed in v4.1 along with the POST methods.*
- **Better error hints** — When you miss a parameter, the error response tells you how to fix it.
- **Mobile-friendly landing page** — Root `/` now shows a simple usage guide instead of just redirecting to /docs.

---

## Quick Start

### Install & Run

```bash
git clone https://github.com/Yz776/apis.git
cd apis
bun install
bun run index.js
```

Server runs at `http://localhost:47291`. Open `http://localhost:47291/docs` for Swagger UI.

### Configuration

Create `.env` (Bun auto-loads):

```env
# Auth (default: disabled — all endpoints open)
ENABLE_AUTH=false
API_KEY=your-secret-key-here

# Server
PORT=47291
```

---

## How to Use — GET only

Semua endpoint memakai **GET** dengan query params (v4.1 menghapus metode POST):

```bash
# Chat dengan Gemini
curl "http://localhost:47291/ai/gemini?prompt=Siapa+penemu+telepon?"

# Download TikTok video
curl "http://localhost:47291/downloader/ssstik?url=https://vm.tiktok.com/xxx"

# Search Wikipedia
curl "http://localhost:47291/search/wikipedia?q=indonesia"

# BMKG earthquake data (no params needed)
curl "http://localhost:47291/tools/gempa"

# Prayer times
curl "http://localhost:47291/islamic/jadwal-sholat?kota=Jakarta"
```

### JavaScript Example

```javascript
const res = await fetch("http://localhost:47291/ai/gemini?prompt=halo")
const data = await res.json()
console.log(data.text)
```

---

## Using in Hoppscotch (Mobile)

1. Set method to **GET**
2. Set URL: `http://your-server:47291/ai/gemini?prompt=halo`
3. Click **Send** — done!

---

## Folder Structure

```
kangwifi-apis/
├── index.js              # Elysia server + Express adapter + CORS + v4 cache/breaker
├── package.json
├── scripts/
│   ├── bench.js          # micro-benchmark
│   └── convert_kana.py   # snippet → feature file converter
├── fitur/                # 296 endpoint files
│   ├── ai/               # AI scrapers (GET)
│   ├── downloader/       # media downloaders (GET)
│   ├── islamic/          # Islamic utilities (GET)
│   ├── maker/            # image/text makers (GET)
│   ├── search/           # search scrapers (GET)
│   ├── tools/            # utility tools (GET)
│   └── kana/             # additional scrapers (GET)
├── lib/
│   ├── qwen.js
│   └── uploader.js
├── assets/               # fonts, JSON data, images used by features
└── public/
    ├── docs.html         # (legacy docs UI, no longer served — Swagger takes over)
    └── scalar.js         # Self-hosted Scalar UI bundle (no CDN dependency)
```

---

## API Documentation

### Swagger UI (Beginner-Friendly)

Access at `http://localhost:47291/docs` — Scalar-powered UI with features:

- Purple theme — dark mode default
- Search bar — press `Ctrl+K` to search across 296 endpoints
- Try-it-out button — test endpoints directly from the browser
- Code examples in multiple languages — curl, JS, Python, Go, PHP, etc.
- Intro Markdown with tutorials and quick examples
- Download OpenAPI spec — import into Postman/Insomnia
- Self-hosted Scalar bundle — works without internet

### Tags

| Tag | Total | Description |
|---|---|---|
| `AI` | 17 | Chat & text generation (Gemini, ChatGPT, Mistral, Qwen, DeepSeek, etc.) |
| `Downloader` | 49 | Media downloaders (TikTok, IG, YouTube, Spotify, etc.) |
| `Search` | 26 | Search engines (Wikipedia, KBBI, Tokopedia, Pinterest, etc.) |
| `Tools` | 47 | Utility tools (QR, TTS, weather, URL shortener, BMKG, etc.) |
| `Maker` | 4 | Image/text makers (brat, quote card, etc.) |
| `Islamic` | 6 | Islamic utilities (Quran, prayer times, asmaul husna, etc.) |

---

## Adding New Endpoints

Create a `.js` file in `fitur/<category>/`:

```js
// fitur/category/newfeature.js
export default {
  route: {
    method: "get",                    // GET-only (v4.1)
    path: "/category/newfeature",
    auth: false,
    tags: ["Category"],
    summary: "Short description",
    description: "Long description (appears in docs)",
    parameters: [
      {
        name: "prompt",
        in: "query",
        required: true,
        description: "What to send",
        schema: { type: "string", example: "hello" },
      },
    ],
    responses: {
      "200": { description: "Success" },
      "400": { description: "Bad request" },
      "500": { description: "Server error" },
    },
  },
  handler: async (req, res) => {
    const { prompt } = req.query
    if (!prompt) return res.status(400).json({ ok: false, error: "prompt wajib diisi", hint: "GET: ?prompt=halo" })
    try {
      res.json({ ok: true, result: prompt })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  },
}
```

Restart server — new endpoint appears in `/docs` automatically.

---

## Auth (Optional — Disabled by Default)

All endpoints are open without API key by default. To enable auth:

```env
ENABLE_AUTH=true
API_KEY=your-secret-key-here
```

---

## Performance

- Bun HTTP server (Zig + JavaScriptCore) — sub-ms latency
- Elysia compiled router — flat switch dispatch
- Parallel feature loading — ~100ms cold start
- CORS headers added inline — no middleware overhead
- GET-only surface (v4.1) — zero handler changes

---

## License

ISC — see [LICENSE](LICENSE).

---

## Author

**kangwifi** — [GitHub](https://github.com/Yz776)

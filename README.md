# Kangwifi APIs v2

> High-performance REST API collection built on **Elysia + Bun**. 142 endpoints, Swagger docs, sub-ms latency, no API key required. **Now supports both GET + POST!**

![Bun](https://img.shields.io/badge/Bun-1.3+-000000?logo=bun&logoColor=white)
![Elysia](https://img.shields.io/badge/Elysia-1.x-00eggf?logo=elysia&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-blue)
![Endpoints](https://img.shields.io/badge/endpoints-142-success)
![POST](https://img.shields.io/badge/POST-supported-9b59b6)

---

## What's New in v2

- **POST support** — Every GET endpoint now also accepts POST with JSON body. Much easier on mobile/Hoppscotch!
- **CORS headers** — All responses include `Access-Control-Allow-Origin: *`. Works in browsers, mobile apps, and cross-origin requests.
- **Smart parameter merging** — On POST, JSON body params override URL query params. Handlers work unchanged for both methods.
- **Better error hints** — When you miss a parameter, the error response tells you how to fix it (GET vs POST examples).
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

## How to Use — 2 Methods

### Method 1: GET (for quick testing)

```bash
# Chat with DeepSeek AI
curl "http://localhost:47291/ai/chatdeep?prompt=halo"

# Chat with Gemini
curl "http://localhost:47291/ai/gemini?prompt=Siapa+penemu+telepon?"

# Download TikTok video
curl "http://localhost:47291/downloader/tiktokio?url=https://vm.tiktok.com/xxx"
```

### Method 2: POST (RECOMMENDED — easier on mobile/Hoppscotch)

```bash
# Chat with DeepSeek AI
curl -X POST "http://localhost:47291/ai/chatdeep" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "halo"}'

# Chat with Gemini
curl -X POST "http://localhost:47291/ai/gemini" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Siapa penemu telepon?"}'

# Chat with ChatGPT
curl -X POST "http://localhost:47291/ai/chatgpt" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Halo, kamu siapa?"}'

# Chat with Mistral AI
curl -X POST "http://localhost:47291/ai/mistral" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Apa itu artificial intelligence?"}'

# DeepSeek with thinking mode
curl -X POST "http://localhost:47291/ai/chatdeep" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Apa itu lubang hitam?", "thinking": true}'

# Qwen with custom model
curl -X POST "http://localhost:47291/ai/qwen" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Jelaskan relativitas", "model": "qwen3.7-plus"}'

# Download TikTok video
curl -X POST "http://localhost:47291/downloader/tiktokio" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://vm.tiktok.com/xxx"}'

# Search Wikipedia
curl -X POST "http://localhost:47291/search/wikipedia" \
  -H "Content-Type: application/json" \
  -d '{"query": "indonesia"}'

# BMKG earthquake data (no params needed)
curl "http://localhost:47291/tools/gempa"

# Prayer times
curl -X POST "http://localhost:47291/islamic/jadwal-sholat" \
  -H "Content-Type: application/json" \
  -d '{"kota": "Jakarta"}'
```

**Why POST is better:**
- No need to URL-encode parameters
- Can send long prompts without issues
- JSON format is cleaner and easier to read
- Just fill in the body in Hoppscotch/Postman — no fuss

### JavaScript Example (POST)

```javascript
const res = await fetch("http://localhost:47291/ai/chatdeep", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: "Apa itu lubang hitam?" })
})
const data = await res.json()
console.log(data.answer)
```

---

## Using in Hoppscotch (Mobile)

1. Set method to **POST**
2. Set URL: `http://your-server:47291/ai/chatdeep`
3. Set Content-Type: `application/json`
4. Set Body:
   ```json
   {
     "prompt": "halo"
   }
   ```
5. Click **Send** — done!

---

## Folder Structure

```
kangwifi-apis/
├── index.js              # Elysia server + Express adapter + CORS + POST support
├── package.json
├── scripts/
│   ├── bench.js          # micro-benchmark
│   └── convert_kana.py   # snippet → feature file converter
├── fitur/                # 142 endpoint files
│   ├── ai/               # AI scrapers (GET + POST)
│   ├── downloader/       # media downloaders (GET + POST)
│   ├── islamic/          # Islamic utilities (GET + POST)
│   ├── maker/            # image/text makers (GET + POST)
│   ├── search/           # search scrapers (GET + POST)
│   ├── tools/            # utility tools (GET + POST)
│   └── kana/             # additional scrapers (GET + POST)
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
- Search bar — press `Ctrl+K` to search across 142 endpoints
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
    method: "get",                    // All GET endpoints auto-get POST too
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
    if (!prompt) return res.status(400).json({ ok: false, error: "prompt wajib diisi", hint: "GET: ?prompt=halo or POST: {\"prompt\": \"halo\"}" })
    try {
      res.json({ ok: true, result: prompt })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  },
}
```

Restart server — new endpoint appears in `/docs` automatically. It will also accept POST with JSON body.

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
- POST support via smart parameter merging — zero handler changes

---

## License

ISC — see [LICENSE](LICENSE).

---

## Author

**kangwifi** — [GitHub](https://github.com/Yz776)

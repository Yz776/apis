# Kangwifi APIs

> High-performance REST API collection built on **Elysia + Bun**. Fork of [kaminoa-api](https://github.com/jauhariel/kaminoa-api) with 41 scrapers integrated from [r2-kana.vercel.app](https://r2-kana.vercel.app/), documented with [@elysiajs/swagger](https://elysiajs.com/plugins/swagger), and rebranded as **Kangwifi APIs**.

![Bun](https://img.shields.io/badge/Bun-1.3+-000000?logo=bun&logoColor=white)
![Elysia](https://img.shields.io/badge/Elysia-1.x-00eggf?logo=elysia&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-blue)
![Endpoints](https://img.shields.io/badge/endpoints-142-success)
![Swagger](https://img.shields.io/badge/docs-Swagger-85EA2D?logo=swagger&logoColor=black)

---

## ✨ Fitur Utama

- 🚀 **Super cepat** — Bun HTTP server (Zig + JavaScriptCore) + Elysia compiled router. Latency sub-millisecond untuk endpoint statis, ~800 req/s throughput.
- 📚 **Swagger UI otomatis** — Buka `/docs` di browser, langsung dapat dokumentasi interaktif Scalar-powered untuk semua 142 endpoint.
- 🔌 **Auto-discovery** — Drop file `.js` di folder `fitur/`, restart, endpoint baru langsung live. Tidak perlu edit file lain.
- 🧩 **41 scraper tambahan dari r2-kana** — Semua di-port otomatis ke endpoint `/kana/*` dengan format yang sama persis dengan endpoint asli.
- 🔐 **API key opsional** — Setiap endpoint bisa di-set `auth: true` atau `auth: false`. Auth check di-inline via `beforeHandle` hook.
- 🛠️ **Express-compatible** — Semua 101 file fitur asli kaminoa tetap utuh tanpa perubahan. Adapter Express-style di `index.js` map ke Elysia context.

---

## 📊 Statistik

| Metric | Value |
|---|---|
| Total endpoints | **142** |
| Endpoint asli kaminoa | 101 |
| Endpoint kana (baru) | 41 |
| Boot time | ~100ms (parallel import) |
| `/docs` latency | ~0.3ms |
| `/docs/json` latency | ~10ms |
| Throughput (`/docs`, 200 concurrent) | ~800 req/s |

---

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) >= 1.3

### Install & Run

```bash
git clone https://github.com/Yz776/apis.git
cd apis
bun install
bun run index.js
```

Server jalan di `http://localhost:47291`. Buka `http://localhost:47291/docs` untuk Swagger UI.

### Konfigurasi

Buat file `.env` (Bun auto-load):

```env
API_KEY=your-secret-key-here
PORT=47291
```

Jika `API_KEY` tidak di-set, endpoint dengan `auth: true` akan menolak semua request. Endpoint dengan `auth: false` selalu terbuka.

---

## 📁 Struktur Folder

```
kangwifi-apis/
├── index.js              # Elysia server + Express adapter + swagger plugin
├── package.json
├── scripts/
│   ├── bench.js          # micro-benchmark
│   └── convert_kana.py   # kana snippet → feature file converter
├── fitur/                # 142 endpoint files
│   ├── ai/               # 10 AI scrapers (kaminoa original)
│   ├── downloader/       # 36 media downloaders (kaminoa original)
│   ├── islamic/          # 6 Islamic utilities (kaminoa original)
│   ├── maker/            # 4 image/text makers (kaminoa original)
│   ├── search/           # 15 search scrapers (kaminoa original)
│   ├── tools/            # 30 utility tools (kaminoa original)
│   └── kana/             # 41 scrapers ported from r2-kana.vercel.app
├── lib/
│   ├── qwen.js
│   └── uploader.js
├── assets/               # fonts, JSON data, images used by features
└── public/
    └── docs.html         # (legacy docs UI, no longer served — Swagger takes over)
```

---

## 📚 Dokumentasi API

### Swagger UI

Akses di `http://localhost:47291/docs` — interactive Scalar-powered UI dengan:
- List semua 142 endpoint, dikelompokkan per tag
- Try-it-out button untuk test endpoint langsung
- Schema request/response lengkap
- API key input untuk endpoint yang butuh auth

### OpenAPI 3 Spec

Raw JSON spec di `http://localhost:47291/docs/json` — bisa di-import ke Postman, Insomnia, atau tools OpenAPI lainnya.

### Tags

| Tag | Jumlah | Deskripsi |
|---|---|---|
| `AI` | 10 | Chat & text generation (Gemini, ChatGPT, Mistral, Qwen, dll.) |
| `Downloader` | 36 | Media downloaders (TikTok, IG, YouTube, Spotify, dll.) |
| `Search` | 15 | Search engines (Wikipedia, KBBI, Tokopedia, dll.) |
| `Tools` | 30 | Utility tools (QR, TTS, weather, URL shortener, dll.) |
| `Maker` | 4 | Image/text makers (brat, quote card, dll.) |
| `Islamic` | 6 | Islamic utilities (Quran, jadwal sholat, asmaul husna, dll.) |
| `Kana · AI` | 9 | AI scrapers dari r2-kana (GPT, Claude, DeepSeek, Quillbot, dll.) |
| `Kana · Downloader` | 6 | Downloaders dari r2-kana (ytmp3, snaptik, igdl, aiodl, dll.) |
| `Kana · Search` | 14 | Search scrapers dari r2-kana (lk21, otakudesu, apkmody, dll.) |
| `Kana · Tools` | 12 | Utility tools dari r2-kana (shortlink, bmkg, yttranscript, dll.) |

---

## 🧩 Contoh Endpoint

### Original kaminoa (Express-style, tetap utuh)

```js
// fitur/ai/gemini.js
export default {
  route: {
    method: "get",
    path: "/ai/gemini",
    auth: false,
    tags: ["AI"],
    summary: "Chat dengan Gemini AI",
    parameters: [
      { name: "prompt", in: "query", required: true, schema: { type: "string" } },
    ],
    responses: { 200: { description: "Berhasil" } },
  },
  handler: async (req, res) => {
    const { prompt } = req.query
    if (!prompt) return res.status(400).json({ ok: false, error: "prompt wajib diisi" })
    const text = await geminiChat(prompt)
    res.json({ ok: true, text })
  },
}
```

### Kana scraper (auto-generated dari r2-kana snippet)

```js
// fitur/kana/bmkg.js (auto-generated from snippet "bmkg.js" by convert_kana.py)
// Auto-generated from r2-kana.vercel.app snippet "bmkg.js" (ihGzhdB)

async function bmkgWeather() {
  // ... original snippet code ...
}

export default {
  route: {
    method: "get",
    path: "/kana/bmkg",
    auth: false,
    tags: ["Kana · Tools"],
    summary: "bmkg",
    parameters: [],
    responses: { 200: { description: "Berhasil" } },
  },
  handler: async (req, res) => {
    try {
      const result = await bmkgWeather()
      return res.json({ ok: true, result })
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message })
    }
  },
}
```

---

## ➕ Menambah Endpoint Baru

Buat file `.js` di `fitur/<kategori>/`:

```js
// fitur/kategori/namafitur.js
export default {
  route: {
    method: "get",                    // get | post | put | patch | delete
    path: "/kategori/nama",
    auth: false,                      // true untuk butuh API key
    tags: ["Kategori"],
    summary: "Deskripsi singkat",
    description: "Deskripsi panjang (opsional)",
    parameters: [
      {
        name: "input",
        in: "query",                  // query | path | header
        required: true,
        description: "Keterangan parameter",
        schema: { type: "string", example: "contoh" },
      },
    ],
    responses: {
      "200": { description: "Berhasil" },
      "400": { description: "Parameter tidak valid" },
      "500": { description: "Kesalahan server" },
    },
  },
  handler: async (req, res) => {
    const { input } = req.query
    if (!input) return res.status(400).json({ ok: false, error: "input wajib diisi" })
    try {
      res.json({ ok: true, result: input })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  },
}
```

Restart server — endpoint baru muncul di `/docs` otomatis.

---

## 🔧 Menambah Scraper dari r2-kana

Re-run converter untuk fetch snippet terbaru dari r2-kana.vercel.app:

```bash
python3 scripts/convert_kana.py
```

Script akan:
1. Fetch semua snippet dari `https://r2-kana.vercel.app/api/snippets`
2. Skip snippet Python, snippet dengan dependency unavailable (socket.io-client, playwright, dll.), dan snippet dengan top-level side effects
3. Strip demo invocation (top-level `await`, IIFE, top-level `const x = await foo()`, dll.) menggunakan tokenizer char-by-char
4. Deteksi nama fungsi utama dari demo invocation
5. Wrap snippet dalam feature file dengan route metadata
6. Tulis ke `fitur/kana/<slug>.js`

---

## ⚡ Performance

### Mengapa cepat?

1. **Bun HTTP server** — Dibangun dengan Zig di atas JavaScriptCore (engine Safari). Startup ~5x lebih cepat dari Node.js, overhead per-request jauh lebih rendah.
2. **Elysia compiled router** — Route tree di-compile saat registration, setiap request hit flat switch bukan middleware chain.
3. **Parallel feature loading** — 142 file fitur di-import paralel via `Promise.all` saat boot. Cold start dari ~1s sequential jadi ~100ms parallel.
4. **In-memory cache** — `docs.html` di-load sekali ke memory, swagger spec di-cache per host. Zero disk I/O per request.
5. **Inline auth** — Auth check di-inline sebagai `beforeHandle` hook, tidak ada middleware indirection.
6. **Native `fetch`** — Bun ship native `fetch` (dipakai oleh `lib/uploader.js`), lebih cepat dari polyfill.

### Benchmark

```bash
bun run scripts/bench.js
```

Hasil tipikal di sistem routes:

| Route | Avg Latency | P50 | P95 |
|---|---|---|---|
| `/docs` (Swagger UI, cached) | 0.13ms | 0.10ms | 0.39ms |
| `/docs/json` (OpenAPI spec, cached) | 1.15ms | 1.15ms | 1.50ms |
| `/islamic/asmaul-husna` (local JSON) | 0.14ms | 0.11ms | 0.26ms |
| `/missing` (404) | 0.07ms | 0.06ms | 0.10ms |
| Throughput (200 concurrent `/docs`) | — | — | **842 req/s** |

---

## 🔐 API Key

Setiap endpoint bisa dikonfigurasi butuh API key via field `auth`:

```js
route: {
  auth: true,   // wajib pakai x-api-key header
  // atau
  auth: false,  // bebas tanpa key
}
```

Request dengan auth:

```bash
curl "http://localhost:47291/endpoint" -H "x-api-key: your_key"
```

Di Swagger UI, tombol "Authorize" muncul di kanan atas untuk input API key.

---

## 📦 Dependencies

### Production

| Package | Versi | Untuk |
|---|---|---|
| `elysia` | ^1.3.0 | HTTP framework |
| `@elysiajs/swagger` | ^1.3.1 | Swagger UI + OpenAPI spec generator |
| `axios` | ^1.18.1 | HTTP client (dipakai banyak feature files) |
| `cheerio` | ^1.2.0 | HTML parser |
| `@napi-rs/canvas` | ^1.0.0 | Canvas untuk image generation (brat, quote) |
| `node-webpmux` | ^3.2.1 | WebP metadata (untuk brat animation) |
| `unfurl.js` | ^6.4.0 | Link preview unfurling |
| `ws` | ^8.21.0 | WebSocket (untuk copilot AI) |
| `form-data` | ^4.0.6 | Multipart form upload (kana scrapers) |
| `crypto-js` | ^4.2.0 | AES encryption (kana: nanobanana, colorizer) |
| `tough-cookie` + `axios-cookiejar-support` | ^6.0.2 / ^7.0.0 | Cookie jar (kana: spotifydl, hdvid) |
| `fetch-cookie` | ^3.2.0 | Cookie-aware fetch (kana: ytdown, apple music) |
| `uuid` | ^14.0.1 | UUID generation (kana: nano banana) |
| `md5` | ^2.3.0 | MD5 hash (kana: moviebox) |
| `cloudscraper` | ^4.6.0 | Cloudflare bypass (kana: groupsor) |
| `node-fetch` | ^3.3.2 | fetch polyfill (kana: gpt, otakudesu) |

---

## 🔄 Migration Notes (dari kaminoa-api asli)

| | Original | Fork ini |
|---|---|---|
| Runtime | Node.js | **Bun 1.3+** |
| HTTP framework | Express 4 | **Elysia 1.x** |
| Docs | Manual `docs.html` | **@elysiajs/swagger (Scalar UI)** |
| `.env` loading | `dotenv/config` import | **Bun auto-load** |
| Feature loading | sequential `await import()` | **`Promise.all` parallel** |
| OpenAPI spec | rebuilt per request | **memoized per host** |
| Auth | Express middleware | **Elysia `beforeHandle` hook** |
| Endpoint count | 101 | **142** (+41 dari r2-kana) |
| Feature files | unchanged | **byte-for-byte identical** |

Semua 101 file fitur asli kaminoa tetap utuh tanpa perubahan. Update dari upstream bisa di-merge tanpa konflik.

---

## 📝 Credits

- **Original kaminoa-api**: [`jauhariel/kaminoa-api`](https://github.com/jauhariel/kaminoa-api)
- **Kana scrapers**: [`r2-kana.vercel.app`](https://r2-kana.vercel.app/) by `ren-offc/kana`
- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [ElysiaJS](https://elysiajs.com/)
- **Docs**: [@elysiajs/swagger](https://elysiajs.com/plugins/swagger) (Scalar UI)

---

## 📜 License

ISC — see [LICENSE](LICENSE).

---

## 👤 Author

**kangwifi** — [GitHub](https://github.com/Yz776)

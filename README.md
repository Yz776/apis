# Kangwifi APIs

> High-performance REST API collection built on **Elysia + Bun**. 142 endpoints, Swagger docs, sub-ms latency, no API key required.

![Bun](https://img.shields.io/badge/Bun-1.3+-000000?logo=bun&logoColor=white)
![Elysia](https://img.shields.io/badge/Elysia-1.x-00eggf?logo=elysia&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-blue)
![Endpoints](https://img.shields.io/badge/endpoints-142-success)
![Swagger](https://img.shields.io/badge/docs-Swagger-85EA2D?logo=swagger&logoColor=black)

---

## ✨ Fitur Utama

- 🚀 **Super cepat** — Bun HTTP server (Zig + JavaScriptCore) + Elysia compiled router. Latency sub-millisecond untuk endpoint statis, ~800 req/s throughput.
- 📚 **Swagger UI otomatis** — Buka `/docs` di browser untuk UI Scalar yang **ramah pemula**: dark mode, search bar, try-it-out button, contoh kode di banyak bahasa (curl, JS, Python, Go, PHP, dll.), tag ber-emoji, dan intro Markdown dengan tutorial cepat. **Self-hosted** — tidak butuh internet.
- 🔌 **Auto-discovery** — Drop file `.js` di folder `fitur/`, restart, endpoint baru langsung live. Tidak perlu edit file lain.
- 🔓 **Tanpa API key** — Semua endpoint terbuka tanpa autentikasi (bisa diaktifkan via `ENABLE_AUTH=true` di `.env` kalau perlu).
- 🛠️ **Express-compatible** — Handler pakai signature Express-style `(req, res)`. Adapter di `index.js` map ke Elysia context.

---

## 📊 Statistik

| Metric | Value |
|---|---|
| Total endpoints | **142** |
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
# Auth (default: disabled — all endpoints open)
ENABLE_AUTH=false
API_KEY=your-secret-key-here

# Server
PORT=47291
```

Jika `ENABLE_AUTH=false` (default), semua endpoint terbuka tanpa API key. Set `ENABLE_AUTH=true` untuk mengaktifkan pengecekan `x-api-key` pada endpoint dengan `auth: true`.

---

## 📁 Struktur Folder

```
kangwifi-apis/
├── index.js              # Elysia server + Express adapter + swagger plugin
├── package.json
├── scripts/
│   ├── bench.js          # micro-benchmark
│   └── convert_kana.py   # snippet → feature file converter
├── fitur/                # 142 endpoint files
│   ├── ai/               # AI scrapers
│   ├── downloader/       # media downloaders
│   ├── islamic/          # Islamic utilities
│   ├── maker/            # image/text makers
│   ├── search/           # search scrapers
│   ├── tools/            # utility tools
│   └── kana/             # additional scrapers
├── lib/
│   ├── qwen.js
│   └── uploader.js
├── assets/               # fonts, JSON data, images used by features
└── public/
    ├── docs.html         # (legacy docs UI, no longer served — Swagger takes over)
    └── scalar.js         # Self-hosted Scalar UI bundle (no CDN dependency)
```

---

## 📚 Dokumentasi API

### Swagger UI (Beginner-Friendly)

Akses di `http://localhost:47291/docs` — UI Scalar-powered dengan fitur:

- 🎨 **Tema purple** — Dark mode default, mudah dilihat berjam-jam
- 🔍 **Search bar** — Tekan `Ctrl+K` untuk cari endpoint di antara 142 endpoint
- 🎮 **Try-it-out button** — Tombol ungu gradient, klik untuk test endpoint langsung dari browser
- 💻 **Contoh kode multi-bahasa** — curl, JavaScript (fetch), Python, Go, PHP, Java, C#, Ruby — siap copy-paste
- 📝 **Intro Markdown** — Tutorial cara pakai, contoh cepat, dan tabel kategori langsung di halaman utama docs
- 🏷️ **Tag ber-emoji** — Setiap kategori punya emoji (🤖 AI, ⬇️ Downloader, 🔍 Search, 🛠️ Tools, 🎨 Maker, 🕌 Islamic) untuk navigasi visual
- 📥 **Download OpenAPI spec** — Tombol untuk download JSON spec, bisa di-import ke Postman/Insomnia
- 🚫 **Hidden clients** — Sembunyikan HTTP client obscure (C, Swift, Kotlin, Dart, dll.) supaya tidak overwhelming
- 🔌 **Self-hosted Scalar bundle** — Tidak butuh internet untuk load docs UI

### OpenAPI 3 Spec

Raw JSON spec di `http://localhost:47291/docs/json` — bisa di-import ke Postman, Insomnia, atau tools OpenAPI lainnya.

### Tags

| Tag | Total | Deskripsi |
|---|---|---|
| `AI` | 17 | 🤖 Chat & text generation (Gemini, ChatGPT, Mistral, Qwen, Claude, DeepSeek, Quillbot, dll.) |
| `Downloader` | 49 | ⬇️ Media downloaders (TikTok, IG, YouTube, Spotify, ytmp3, snaptik, aiodl, dll.) |
| `Search` | 26 | 🔍 Search engines (Wikipedia, KBBI, Tokopedia, lk21, otakudesu, apkmody, dll.) |
| `Tools` | 47 | 🛠️ Utility tools (QR, TTS, weather, URL shortener, bmkg, yttranscript, dll.) |
| `Maker` | 4 | 🎨 Image/text makers (brat, quote card, dll.) |
| `Islamic` | 6 | 🕌 Islamic utilities (Quran, jadwal sholat, asmaul husna, dll.) |

---

## 🧩 Contoh Endpoint

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

---

## ➕ Menambah Endpoint Baru

Buat file `.js` di `fitur/<kategori>/`:

```js
// fitur/kategori/namafitur.js
export default {
  route: {
    method: "get",                    // get | post | put | patch | delete
    path: "/kategori/nama",
    auth: false,                      // true untuk butuh API key (saat ENABLE_AUTH=true)
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

## ⚡ Performance

### Mengapa cepat?

1. **Bun HTTP server** — Dibangun dengan Zig di atas JavaScriptCore (engine Safari). Startup ~5x lebih cepat dari Node.js, overhead per-request jauh lebih rendah.
2. **Elysia compiled router** — Route tree di-compile saat registration, setiap request hit flat switch bukan middleware chain.
3. **Parallel feature loading** — 142 file fitur di-import paralel via `Promise.all` saat boot. Cold start dari ~1s sequential jadi ~100ms parallel.
4. **In-memory cache** — Swagger spec di-cache per host. Zero disk I/O per request.
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

## 🔐 Auth (Optional — Disabled by Default)

**Semua endpoint terbuka tanpa API key** secara default. Flag `auth: true` di feature file **diabaikan** kecuali Anda mengaktifkan auth secara eksplisit.

Untuk mengaktifkan auth:

1. Edit `.env`:
   ```env
   ENABLE_AUTH=true
   API_KEY=your-secret-key-here
   ```
2. Restart server.

Sekarang endpoint dengan `auth: true` akan menolak request tanpa header `x-api-key`:

```bash
curl "http://localhost:47291/endpoint" -H "x-api-key: your_key"
```

Di Swagger UI, tombol "Authorize" muncul di kanan atas untuk input API key (hanya saat `ENABLE_AUTH=true`).

### Default behavior (no auth)

```bash
# Langsung pakai — tanpa header
http://localhost:47291/ai/gemini?prompt=halo
http://localhost:47291/tools/gempa
http://localhost:47291/islamic/jadwal-sholat?kota=Jakarta
```

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
| `form-data` | ^4.0.6 | Multipart form upload |
| `crypto-js` | ^4.2.0 | AES encryption |
| `tough-cookie` + `axios-cookiejar-support` | ^6.0.2 / ^7.0.0 | Cookie jar |
| `fetch-cookie` | ^3.2.0 | Cookie-aware fetch |
| `uuid` | ^14.0.1 | UUID generation |
| `md5` | ^2.3.0 | MD5 hash |
| `cloudscraper` | ^4.6.0 | Cloudflare bypass |
| `node-fetch` | ^3.3.2 | fetch polyfill |

---

## 📜 License

ISC — see [LICENSE](LICENSE).

---

## 👤 Author

**kangwifi** — [GitHub](https://github.com/Yz776)

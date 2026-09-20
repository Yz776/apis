// Test harness: hits every unique endpoint from endpoints.json with sensible test params.
// Usage: node test-harness.mjs [--only <prefix>] [--out <file>] [--conc <n>] [--timeout <ms>]
import { readFileSync, writeFileSync } from "fs"

const BASE = "http://localhost:47291"
const args = process.argv.slice(2)
function arg(name, def) {
    const i = args.indexOf(name)
    return i >= 0 ? args[i + 1] : def
}
const only = arg("--only", "")
const outFile = arg("--out", "test_run.json")
const CONC = Number(arg("--conc", "6"))
const TIMEOUT = Number(arg("--timeout", "40000"))

const YTV = "https://www.youtube.com/watch?v=jNQXAC9IVRw" // Me at the zoo (public, captioned)
const YTM = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
const TIKTOK = "https://www.tiktok.com/@tiktok/video/7106594312292453675"
const VM_TIKTOK = "https://vt.tiktok.com/ZS2bTukUL/"
const IG = "https://www.instagram.com/p/C2rMEWbpDkT/"
const FB = "https://www.facebook.com/watch/?v=10153231379946729"
const SPOTIFY_TRACK = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"
const SPOTIFY_PLAYLIST = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
const THREADS = "https://www.threads.net/@instagram/post/C3JhP8xLrhV"
const PINTEREST = "https://id.pinterest.com/pin/295826858285426751/"
const IMG = "https://picsum.photos/id/237/400/400.jpg"
const IMG2 = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png"

// Per-path overrides for platform-specific params
const overrides = {
    "/downloader/cnv": { url: YTM },
    "/downloader/ensaveyt": { url: YTM },
    "/downloader/kolyt": { url: YTM },
    "/downloader/savetube": { url: YTM },
    "/downloader/y2meta": { url: YTM },
    "/downloader/y2mategs": { url: YTM },
    "/downloader/youtube-summary": { url: YTM },
    "/downloader/yttranscript": { url: YTM },
    "/downloader/ssstik": { url: TIKTOK },
    "/downloader/snaptik": { url: TIKTOK },
    "/downloader/musicaldown": { url: "https://vm.tiktok.com/ZSQbmkw89/" },
    "/downloader/tikwm": { url: TIKTOK },
    "/downloader/aiodl": { url: TIKTOK },
    "/downloader/savefrom": { url: TIKTOK },
    "/downloader/savenow": { url: TIKTOK },
    "/downloader/aio2": { url: TIKTOK },
    "/downloader/9xbuddy": { url: TIKTOK },
    "/downloader/flickreels": { url: "korean drama" },
    "/downloader/igvid": { url: "https://www.instagram.com/reel/DXVZ4yCCG0J/" },
    "/downloader/instagram": { url: "https://www.instagram.com/p/DaHSc8TjxAW/" },
    "/downloader/instagram2": { url: "https://www.instagram.com/reel/DZOyRZNTfLZ/" },
    "/downloader/instashadow": { url: "https://www.instagram.com/reel/DathhigO4m9/" },
    "/downloader/kolig": { url: "https://www.instagram.com/reel/DXVZ4yCCG0J/" },
    "/downloader/fbdown": { url: FB },
    "/downloader/musicfab": { url: SPOTIFY_TRACK },
    "/downloader/spotidown": { url: SPOTIFY_TRACK },
    "/downloader/spotitrack": { url: SPOTIFY_TRACK },
    "/downloader/threads": { url: THREADS },
    "/downloader/threadsdl": { url: "https://www.threads.com/@esports.ku/post/DZm4eSFEiDs" },
    "/downloader/threadster": { url: "https://www.threads.com/@citra_nurmalasarii/post/DZmxdS9mIw0" },
    "/downloader/pindown": { url: "https://pin.it/uWysLLKpr" },
    "/downloader/yt-music": { query: "lathi" },
    "/search/spotify-playlist": { url: SPOTIFY_PLAYLIST },
    "/tools/hd": { url: IMG },
    "/tools/ihancer": { url: IMG },
    "/tools/photoihancer": { url: IMG },
    "/tools/picsart": { url: IMG },
    "/tools/remini": { url: IMG },
    "/tools/removalai": { url: IMG },
    "/tools/removebg": { url: IMG },
    "/tools/restoredphoto": { url: IMG },
    "/tools/visualparadigm": { url: IMG },
    "/tools/wink/enhancer": { url: IMG },
    "/tools/zoneai/img2txt": { url: IMG2 },
    "/tools/nyckel-nsfw": { url: IMG2 },
    "/tools/ufile": { url: IMG },
    "/tools/uploader": { url: IMG2 },
    "/tools/linkpreview": { url: "https://github.com" },
    "/tools/shortlink": { url: "https://github.com" },
    "/tools/shorturl": { url: "https://github.com" },
    "/tools/webshot": { url: "https://example.com" },
    "/tools/cuaca-global": { kota: "Jakarta" },
    "/search/ff-verify": { id: "1305785267" },
    "/search/stalk-game": { game: "ml", id: "848509674" },
    "/search/gsmarena": { query: "iphone 15" },
    "/search/cek-nik": { nik: "3201020101800001" },
    "/search/cek-plat": { plate: "B 1234 ABC" },
    "/search/tokopedia": { q: "laptop" },
    "/search/youtube": { q: "lathi" },
    "/search/kbbi": { q: "kucing" },
    "/search/pinterest": { query: "anime" },
    "/search/pinterest2": { query: "anime" },
    "/search/otakudesu": { query: "naruto" },
    "/search/moviev2": { query: "avatar" },
    "/search/iq-search-drama": { query: "korean" },
    "/search/ik21": { query: "avengers" },
    "/search/manhwalist02": { query: "solo leveling" },
    "/search/groupsor": { query: "indonesia" },
    "/search/spotify": { query: "lathi" },
    "/search/wikipedia": { query: "Indonesia" },
    "/search/youtube-playlist": { url: "PLBCF2DAC6FFB574DE" },
    // ── fixes dari round 1 (param lama salah/stale) ──
    "/anime/anibiplay": { query: "naruto" },
    "/anime/dubindo": { query: "naruto" },
    "/anime/hurawatch": { query: "naruto" },
    "/anime/klikfilm": { query: "avatar" },
    "/anime/samehadaku": { query: "naruto" },
    "/downloader/soundcloud": { query: "lathi" },
    "/downloader/ensave": { url: YTM },
    "/info/currency": { from: "USD", to: "IDR", amount: "1" },
    "/info/holidays": { country: "ID", year: "2025" },
    "/info/ip": { ip: "8.8.8.8" },
    "/islamic/jadwal-sholat": { kota: "Jakarta" },
    "/islamic/quran-surah": { id: "1" },
    "/search/stalk-game": { game: "ml", id: "157228049", zone: "2241" },
    "/search/nhentai": { q: "naruto" },
    "/tools/cuaca": { daerah: "sumenep" },
    "/tools/qrcode": { text: "halo dunia" },
    "/tools/sekolah": { type: "search", query: "sma 1 jakarta" },
    "/utils/base-converter": { value: "255", from: "10", to: "2" },
    "/utils/bitwise": { op: "and", a: "6", b: "3" },
    "/utils/char-code": { text: "halo" },
    "/utils/ean13": { code: "4006381333931" },
    "/utils/fraction": { decimal: "0.75" },
    "/utils/interest": { principal: "1000000", rate: "5", time: "2" },
    "/utils/ipv4-info": { ip: "8.8.8.8" },
    "/utils/ipv4-subnet": { cidr: "192.168.1.0/24" },
    "/utils/json-to-csv": { json: '[{"a":1},{"a":2}]' },
    "/utils/jwt-decode": { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U" },
    "/utils/modular-arithmetic": { op: "add", a: "5", b: "3", m: "7" },
    "/utils/percentage": { mode: "of", x: "50", y: "200" },
    "/utils/perfect-number": { n: "28" },
    "/utils/permutation-combination": { n: "5", r: "2" },
    "/utils/quadratic": { a: "1", b: "-3", c: "2" },
    "/utils/query-string": { qs: "?a=1&b=2", mode: "parse" },
    "/utils/roman": { value: "2024" },
    "/utils/trig": { func: "sin", x: "30", unit: "deg" },
    "/utils/unicode-info": { char: "A" },
    "/utils/unit-angle": { value: "180", from: "deg", to: "rad" },
    "/utils/unit-data": { value: "1", from: "MB", to: "KB" },
    "/utils/unit-length": { value: "100", from: "m", to: "km" },
    "/utils/unit-speed": { value: "100", from: "kph", to: "mph" },
    "/utils/unit-temperature": { value: "100", from: "c", to: "f" },
    "/utils/unit-time": { value: "2", from: "day", to: "hr" },
    "/utils/unit-weight": { value: "70", from: "kg", to: "lb" },
    "/utils/matrix-op": { a: "[[1,2],[3,4]]", op: "transpose" },
    "/utils/vector-op": { a: "[1,2,3]", op: "magnitude" },
    "/tools/ytmeta": { url: YTM },
    "/info/dictionary": { word: "hello" },
    "/info/arxiv": { q: "quantum" },
    "/tools/nyckel-nsfw": { url: IMG },
    "/info/pokemon": { name: "pikachu" },
    "/search/ff-verify": { id: "1000695760" },
    "/search/gsm-area": { nomor: "081234567890" },
    "/info/university": { name: "harvard" },
    "/tools/uploader": { url: IMG },
    "/ai/pollinations": { prompt: "seekor kucing Astronot", width: "512", height: "512", check: "true" },
    "/ai/g-ai": { query: "info" },
    "/search/wikipedia": { q: "Indonesia" },
    "/search/appstore": { query: "whatsapp" },
    "/search/image": { query: "kucing", limit: "10" },
    "/tools/zoneai/img2txt": { url: IMG },
}

// Generic defaults by param name
const defaults = {
    text: "Halo dunia ini adalah teks percobaan",
    url: "https://example.com",
    query: "anime",
    prompt: "Siapa presiden pertama Indonesia? Jawab singkat.",
    q: "kucing",
    value: "hello",
    from: "en", to: "id",
    a: "8", b: "2", n: "10", x: "5", k: "3", op: "add",
    name: "budi", id: "123456789", username: "octocat",
    password: "Tr0ub4dor&3",
    json: '{"a":1,"b":[2,3]}',
    lat: "-6.2", lon: "106.8",
    lat1: "-6.2", lon1: "106.8", lat2: "-7.8", lon2: "110.4",
    color: "#ff0000",
    numbers: "1,2,3,4,5",
    key: "halo dunia",
    isbn: "9780134685991",
    number: "42",
    mode: "encode",
    birth: "2000-01-15",
    year: "2020", month: "5", day: "15",
    word: "hello",
    domain: "github.com",
    owner: "vercel", repo: "next.js",
    country: "indonesia",
    nik: "3201020101800001",
    plate: "B 1234 ABC",
    game: "ml",
    source: "en",
    page: "1",
    char: "a",
    find: "halo", replace: "hai",
    pattern: "halo",
    kota: "Jakarta",
    input: "halo",
    type: "search",
    csv: "name,age\nbudi,20",
    code: "IDR",
    email: "test@example.com",
    emoji: "😀",
    principal: "1000000",
    weight: "70", height: "170",
    proxy: "",
}

function buildParams(path, requiredList) {
    const ov = overrides[path] || {}
    const params = {}
    for (const r of requiredList) {
        if (!r.required) continue
        params[r.name] = ov[r.name] ?? defaults[r.name] ?? "test"
    }
    // allow overrides for optional params too
    for (const [k, v] of Object.entries(ov)) {
        if (!(k in params)) params[k] = v
    }
    return params
}

// endpoints yang tidak boleh di-test harness (keputusan pemeliharaan)
const EXCLUDE_PATHS = [/alight-motion/i]

const eps = JSON.parse(readFileSync("endpoints.json", "utf8"))
const uniq = new Map()
for (const e of eps) if (!uniq.has(e.path)) uniq.set(e.path, e)
let list = [...uniq.values()].filter(e => e.method === "get" && !e.path.startsWith("/admin") && !EXCLUDE_PATHS.some(rx => rx.test(e.path)) && (only ? e.path.startsWith(only) : true))
const failedFile = arg("--failed", "")
if (failedFile) {
    const prev = JSON.parse(readFileSync(failedFile, "utf8"))
    const bad = new Set(prev.filter(r => r.cls === "FAIL" || r.cls === "RATE").map(r => r.path))
    list = list.filter(e => bad.has(e.path))
}
console.log(`Testing ${list.length} endpoints (conc=${CONC}, timeout=${TIMEOUT}ms)`)

async function hit(method, path, params) {
    const url = new URL(BASE + path)
    for (const [k, v] of Object.entries(params)) if (v !== "") url.searchParams.set(k, v)
    const t0 = Date.now()
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { "accept": "application/json, */*" } })
        const ms = Date.now() - t0
        let body, isJson = false
        const ct = res.headers.get("content-type") || ""
        if (ct.includes("json")) {
            body = await res.json().catch(() => null)
            isJson = true
        } else {
            const txt = await res.text().catch(() => "")
            body = txt.slice(0, 400)
            isJson = false
        }
        return { status: res.status, ms, body, isJson, ct }
    } catch (e) {
        return { status: 0, ms: Date.now() - t0, body: String(e?.cause?.code || e?.name || e?.message || e), isJson: false }
    }
}

// Judge: does the endpoint look like it works?
function judge(r, path) {
    if (r.status === 0) return { cls: "FAIL", why: "unreachable/timeout: " + r.body }
    if (r.status >= 500) return { cls: "FAIL", why: `HTTP ${r.status}` }
    if (r.status === 429) return { cls: "RATE", why: "429 rate limited" }
    if (r.status >= 400) return { cls: "FAIL", why: `HTTP ${r.status}` }
    if (r.isJson && r.body && typeof r.body === "object") {
        const b = r.body
        const okFlag = b.ok ?? b.success
        if (okFlag === false) {
            const msg = String(b.error || b.message || "").slice(0, 200)
            return { cls: "FAIL", why: `ok:false → ${msg}` }
        }
        const errText = b.error || b.message
        if (errText && typeof errText === "string" && /error|gagal|failed|invalid|not found|tidak/i.test(errText) && !errText.includes("null")) {
            return { cls: "CHECK", why: `errorish: ${String(errText).slice(0, 160)}` }
        }
        const keys = Object.keys(b)
        const hasData = keys.length > 0
        return { cls: hasData ? "OK" : "EMPTY", why: `keys: ${keys.slice(0, 8).join(",")}` }
    }
    // non-JSON (html, image, text)
    const len = typeof r.body === "string" ? r.body.length : 0
    return { cls: len > 0 ? "OK-BIN" : "EMPTY", why: `non-json ct=${r.ct} len=${len}` }
}

const results = []
let idx = 0
const RETRY = Number(arg("--retry", "3")) // attempts for transient (socket/timeout/429/5xx) failures
const isTransient = (r, j) => r.status === 0 || r.status === 429 || r.status >= 500 || j.cls === "RATE"
async function worker() {
    while (idx < list.length) {
        const e = list[idx++]
        const params = buildParams(e.path, e.required || [])
        let r, j, attempts = 1
        while (true) {
            r = await hit(e.method, e.path, params)
            j = judge(r, e.path)
            if (!isTransient(r, j) || attempts >= RETRY) break
            attempts++
            await new Promise(res => setTimeout(res, 1500))
        }
        const snippet = r.isJson ? JSON.stringify(r.body).slice(0, 250) : String(r.body).slice(0, 150)
        const tag = attempts > 1 ? ` (ok on try ${attempts})` : ""
        results.push({ path: e.path, method: e.method, params, status: r.status, ms: r.ms, cls: j.cls, why: j.why + tag, snippet, attempts })
        process.stdout.write(`[${results.length}/${list.length}] ${j.cls.padEnd(7)} ${String(r.status).padEnd(3)} ${String(r.ms).padStart(6)}ms ${e.path} :: ${(j.why + tag).slice(0, 90)}\n`)
    }
}
await Promise.all(Array.from({ length: CONC }, worker))
writeFileSync(outFile, JSON.stringify(results, null, 1))
const counts = {}
for (const r of results) counts[r.cls] = (counts[r.cls] || 0) + 1
console.log("\nSUMMARY:", JSON.stringify(counts))
console.log("Saved to", outFile)

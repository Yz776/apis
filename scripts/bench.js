// scripts/bench.js
// Quick micro-benchmark against the running server.
// Usage:
//   bun run index.js &           # start the server
//   bun run scripts/bench.js     # run this bench

const BASE = process.env.BASE_URL || "http://localhost:47291"

const targets = [
    { name: "/docs            (in-memory HTML cache)", path: "/docs" },
    { name: "/openapi.json    (cached OpenAPI spec)",  path: "/openapi.json" },
    { name: "/islamic/asmaul-husna (local JSON file)", path: "/islamic/asmaul-husna?no=1" },
    { name: "/                (302 redirect)",         path: "/" },
    { name: "/missing         (404 path)",              path: "/this-route-does-not-exist" },
]

const ROUNDS = 50

async function hit(path) {
    const t0 = performance.now()
    const r = await fetch(`${BASE}${path}`)
    await r.arrayBuffer() // drain
    return { status: r.status, ms: performance.now() - t0 }
}

function stats(samples) {
    const xs = samples.map(s => s.ms).sort((a, b) => a - b)
    const avg = xs.reduce((a, b) => a + b, 0) / xs.length
    const p50 = xs[Math.floor(xs.length * 0.5)]
    const p95 = xs[Math.floor(xs.length * 0.95)]
    const min = xs[0]
    const max = xs[xs.length - 1]
    return { avg, p50, p95, min, max }
}

console.log(`Benchmarking ${BASE} — ${ROUNDS} requests per target\n`)
console.log("target".padEnd(46), "avg", "  p50", "  p95", "  min", "  max")
console.log("-".repeat(86))

for (const t of targets) {
    // warmup
    await hit(t.path)
    await hit(t.path)

    const samples = []
    for (let i = 0; i < ROUNDS; i++) samples.push(await hit(t.path))

    const s = stats(samples)
    const fmt = (n) => `${n.toFixed(2)}ms`.padStart(8)
    console.log(
        t.name.padEnd(46),
        fmt(s.avg), fmt(s.p50), fmt(s.p95), fmt(s.min), fmt(s.max),
    )
}

// Throughput test: fire ROUNDS requests concurrently to /docs
console.log("\nThroughput (concurrent /docs):")
const BATCH = 200
const t0 = performance.now()
const batch = []
for (let i = 0; i < BATCH; i++) batch.push(hit("/docs"))
const results = await Promise.all(batch)
const elapsed = performance.now() - t0
const ok = results.filter(r => r.status === 200).length
const rps = (ok / elapsed * 1000).toFixed(0)
console.log(`  ${ok}/${BATCH} ok in ${elapsed.toFixed(1)}ms → ${rps} req/s`)

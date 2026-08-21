// /info/crypto-price — crypto price from CoinGecko (with fallback to Coinbase)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Map common coin IDs to Coinbase symbols for the fallback path
const COINBASE_SYMBOL_MAP = {
    bitcoin: "BTC",
    ethereum: "ETH",
    litecoin: "LTC",
    dogecoin: "DOGE",
    solana: "SOL",
    cardano: "ADA",
    polkadot: "DOT",
    ripple: "XRP",
    binancecoin: "BNB",
    tron: "TRX",
    avalanche: "AVAX",
    chainlink: "LINK",
    polygon: "MATIC",
    stellar: "XLM",
    "usd-coin": "USDC",
    tether: "USDT",
}

async function fetchCoinGecko(coin, vs) {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coin)}&vs_currencies=${encodeURIComponent(vs)}&include_24hr_change=true&include_market_cap=true&include_last_updated_at=true`
    for (let attempt = 0; attempt < 3; attempt++) {
        const r = await fetch(url, {
            headers: {
                "Accept": "application/json",
                "User-Agent": "KangwifiAPI/1.0",
            },
        })
        if (r.status === 429) {
            // Rate-limited — backoff and retry
            await sleep(800 * (attempt + 1))
            continue
        }
        return r
    }
    return null
}

async function fetchCoinbaseFallback(coinIds, vs) {
    // vs normalization: usd, eur, idr, etc.
    const cur = String(vs || "usd").toLowerCase()
    const out = {}
    for (const id of coinIds) {
        const sym = COINBASE_SYMBOL_MAP[id]
        if (!sym) continue
        const url = `https://api.coinbase.com/v2/prices/${sym}-${cur}/spot`
        try {
            const r = await fetch(url, { headers: { "Accept": "application/json" } })
            if (r.ok) {
                const j = await r.json()
                const price = parseFloat(j?.data?.amount)
                if (!isNaN(price)) {
                    out[id] = {
                        [cur]: price,
                        last_updated_at: Math.floor(Date.now() / 1000),
                    }
                }
            }
        } catch {}
    }
    return out
}

export default {
    route: {
        method: "get",
        path: "/info/crypto-price",
        auth: false,
        tags: ["Info"],
        summary: "Crypto price (CoinGecko + Coinbase fallback)",
        description: "Harga crypto saat ini. Primary: CoinGecko (free, no API key). Saat rate-limited, fallback otomatis ke Coinbase API.",
        parameters: [
            { name: "coin", in: "query", required: false, description: "Coin ID (default bitcoin). Bisa banyak dipisah koma.", schema: { type: "string", default: "bitcoin", example: "bitcoin,ethereum" } },
            { name: "vs", in: "query", required: false, description: "Mata uang (default usd)", schema: { type: "string", default: "usd", example: "usd" } },
        ],
        responses: { "200": { description: "Harga crypto" }, "502": { description: "Upstream error" } },
    },
    handler: async (req, res) => {
        try {
            const coin = String(req.query.coin || "bitcoin")
            const vs = String(req.query.vs || "usd")
            const r = await fetchCoinGecko(coin, vs)

            if (!r || r.status === 429) {
                // CoinGecko rate-limited — try Coinbase fallback
                const ids = coin.split(",").map((s) => s.trim()).filter(Boolean)
                const prices = await fetchCoinbaseFallback(ids, vs)
                if (Object.keys(prices).length > 0) {
                    return res.json({
                        ok: true,
                        vs_currency: vs,
                        prices,
                        source: "coinbase-fallback",
                        note: "CoinGecko sedang rate-limited, harga diambil dari Coinbase API",
                    })
                }
                return res.status(503).json({
                    ok: false,
                    error: "CoinGecko rate-limited (HTTP 429) dan fallback Coinbase tidak tersedia untuk coin ini. Coba lagi nanti.",
                    retryAfter: 60,
                })
            }
            if (!r.ok) return res.status(502).json({ ok: false, error: "CoinGecko error: HTTP " + r.status })
            const data = await r.json()
            res.json({ ok: true, vs_currency: vs, prices: data, source: "coingecko" })
        } catch (e) { res.status(502).json({ ok: false, error: e.message }) }
    },
}

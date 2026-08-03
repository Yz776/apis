// /info/crypto-price — crypto price from CoinGecko
export default {
    route: {
        method: "get",
        path: "/info/crypto-price",
        auth: false,
        tags: ["Info"],
        summary: "Crypto price (CoinGecko)",
        description: "Harga crypto saat ini dari CoinGecko (free, no API key). Mendukung multiple coin vs currency.",
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
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coin)}&vs_currencies=${encodeURIComponent(vs)}&include_24hr_change=true&include_market_cap=true&include_last_updated_at=true`
            const r = await fetch(url, { headers: { "Accept": "application/json" } })
            if (!r.ok) return res.status(502).json({ ok: false, error: "CoinGecko error: " + r.status })
            const data = await r.json()
            res.json({ ok: true, vs_currency: vs, prices: data })
        } catch (e) { res.status(502).json({ ok: false, error: e.message }) }
    },
}

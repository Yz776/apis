// /info/crypto-coingecko — Crypto Prices via CoinGecko (Free tier: 10-50 req/min)
// Sumber: https://www.coingecko.com/en/api/documentation
// Catatan: Free tier, no API key needed for basic usage. Rate limit: 10-50 req/min
export default {
    route: {
        method: "get",
        path: "/info/crypto-coingecko",
        auth: false,
        tags: ["Info", "Finance", "Crypto"],
        summary: "Harga Crypto via CoinGecko",
        description: "Harga real-time cryptocurrency (Bitcoin, Ethereum, dll.) dari CoinGecko. Free tier: 10-50 req/min.",
        parameters: [
            { name: "ids", in: "query", required: true, description: "Coin IDs (comma-separated): bitcoin,ethereum,solana", schema: { type: "string", example: "bitcoin,ethereum" } },
            { name: "vs_currencies", in: "query", required: false, description: "Mata uang target (comma-separated): usd,idr,eur", schema: { type: "string", default: "usd,idr" } },
            { name: "include_24hr_change", in: "query", required: false, description: "Sertakan perubahan 24h", schema: { type: "boolean", default: true } },
            { name: "include_last_updated_at", in: "query", required: false, description: "Sertakan timestamp update", schema: { type: "boolean", default: true } },
        ],
        responses: { "200": { description: "Harga crypto" }, "400": { description: "Parameter tidak valid" }, "429": { description: "Rate limit" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const { ids, vs_currencies = "usd,idr", include_24hr_change = "true", include_last_updated_at = "true" } = req.query
        if (!ids) return res.status(400).json({ ok: false, error: "ids wajib diisi (contoh: bitcoin,ethereum)" })
        const url = new URL("https://api.coingecko.com/api/v3/simple/price")
        url.searchParams.set("ids", ids)
        url.searchParams.set("vs_currencies", vs_currencies)
        url.searchParams.set("include_24hr_change", include_24hr_change)
        url.searchParams.set("include_last_updated_at", include_last_updated_at)
        try {
            const res2 = await fetch(url, { headers: { "user-agent": "Kangwifi-API/1.0", accept: "application/json" }, signal: AbortSignal.timeout(15_000) })
            if (res2.status === 429) return res.status(429).json({ ok: false, error: "Rate limit CoinGecko (coba lagi nanti)" })
            const data = await res2.json()
            res.json({ ok: true, source: "CoinGecko", data })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}
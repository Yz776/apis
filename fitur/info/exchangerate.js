// /info/exchangerate — Kurs Mata Uang via ExchangeRate-API (Free tier: 1500 req/bulan)
// Sumber: https://www.exchangerate-api.com/docs/free
// Catatan: Free tier 1500 req/bulan, base USD
export default {
    route: {
        method: "get",
        path: "/info/exchangerate",
        auth: false,
        tags: ["Info", "Finance"],
        summary: "Kurs Mata Uang (ExchangeRate-API)",
        description: "Kurs tukar mata uang real-time dari ExchangeRate-API. Free tier: 1500 req/bulan, base USD.",
        parameters: [
            { name: "base", in: "query", required: false, description: "Mata uang dasar (default USD)", schema: { type: "string", default: "USD" } },
            { name: "target", in: "query", required: false, description: "Mata uang target (kosong = semua)", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Data kurs" }, "400": { description: "Parameter tidak valid" }, "429": { description: "Rate limit" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const { base = "USD", target } = req.query
        const url = new URL(`https://open.er-api.com/v6/latest/${base}`)
        try {
            const res2 = await fetch(url, { headers: { "user-agent": "Kangwifi-API/1.0" }, signal: AbortSignal.timeout(10_000) })
            const data = await res2.json()
            if (data.result === "error") return res.status(400).json({ ok: false, error: data["error-type"] || "Invalid request" })
            let rates = data.rates
            if (target) {
                const t = target.toUpperCase()
                if (rates[t]) rates = { [t]: rates[t] }
                else return res.status(400).json({ ok: false, error: `Mata uang ${t} tidak ditemukan` })
            }
            res.json({ ok: true, source: "ExchangeRate-API", base: data.base_code, date: data.time_last_update_utc, rates })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}
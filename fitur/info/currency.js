// /info/currency — Currency conversion (open.er-api.com - free, no key)
import axios from "axios"

export default {
    route: {
        method: "get",
        path: "/info/currency",
        auth: false,
        tags: ["Info"],
        summary: "Currency converter",
        description: "Konversi mata uang menggunakan kurs terkini via open.er-api.com (gratis, tanpa API key).",
        parameters: [
            { name: "from", in: "query", required: true, description: "Kode mata uang sumber (mis. USD)", schema: { type: "string", example: "USD" } },
            { name: "to", in: "query", required: true, description: "Kode mata uang tujuan (mis. IDR)", schema: { type: "string", example: "IDR" } },
            { name: "amount", in: "query", required: false, description: "Jumlah (default 1)", schema: { type: "number", default: 1, example: 100 } },
        ],
        responses: { "200": { description: "Hasil konversi" }, "400": { description: "Parameter tidak valid" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const from = String(req.query.from || "").trim().toUpperCase()
        const to = String(req.query.to || "").trim().toUpperCase()
        const amount = parseFloat(req.query.amount) || 1
        if (!from || !to) return res.status(400).json({ ok: false, error: "from dan to wajib diisi (kode 3 huruf, mis. USD, IDR)" })
        if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) return res.status(400).json({ ok: false, error: "from dan to harus 3 huruf" })
        try {
            const { data } = await axios.get(`https://open.er-api.com/v6/latest/${from}`, { timeout: 15000 })
            if (data.result !== "success") return res.status(400).json({ ok: false, error: "Mata uang sumber tidak ditemukan" })
            const rate = data.rates?.[to]
            if (!rate) return res.status(400).json({ ok: false, error: "Mata uang tujuan tidak ditemukan" })
            const converted = +(amount * rate).toFixed(4)
            res.json({ ok: true, from, to, amount, rate, converted, updated_at: data.time_last_update_utc, next_update: data.time_next_update_utc })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

// /info/bored — random activity to do when bored
export default {
    route: {
        method: "get",
        path: "/info/bored",
        auth: false,
        tags: ["Info"],
        summary: "Random activity when bored",
        description: "Aktivitas acak dari Bored API. Bisa filter berdasarkan type atau participants.",
        parameters: [
            { name: "type", in: "query", required: false, description: "Jenis aktivitas: education/recreational/social/diy/charity/cooking/relaxation/music/busywork", schema: { type: "string", example: "recreational" } },
            { name: "participants", in: "query", required: false, description: "Jumlah peserta (1-5)", schema: { type: "integer", example: 2 } },
        ],
        responses: { "200": { description: "Aktivitas acak" }, "502": { description: "Upstream error" } },
    },
    handler: async (req, res) => {
        try {
            const params = new URLSearchParams()
            if (req.query.type) params.set("type", String(req.query.type))
            if (req.query.participants) params.set("participants", parseInt(req.query.participants, 10))
            const url = "https://www.boredapi.com/api/activity" + (params.toString() ? "?" + params.toString() : "")
            const r = await fetch(url, { headers: { "Accept": "application/json" } })
            if (!r.ok) return res.status(502).json({ ok: false, error: "Bored API error: " + r.status })
            const data = await r.json()
            if (data.error) return res.status(404).json({ ok: false, error: data.error })
            res.json({ ok: true, ...data })
        } catch (e) { res.status(502).json({ ok: false, error: e.message }) }
    },
}

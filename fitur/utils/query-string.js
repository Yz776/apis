// /utils/query-string — parse/build query string
export default {
    route: {
        method: "get",
        path: "/utils/query-string",
        auth: false,
        tags: ["Utils"],
        summary: "Query string parser/builder",
        description: "Parse query string ke object, atau build query string dari pasangan key=value.",
        parameters: [
            { name: "mode", in: "query", required: true, description: "parse atau build", schema: { type: "string", enum: ["parse", "build"], example: "parse" } },
            { name: "qs", in: "query", required: false, description: "Query string untuk parse (mis. foo=bar&baz=qux)", schema: { type: "string", example: "foo=bar&baz=qux&foo=second" } },
            { name: "params", in: "query", required: false, description: "Untuk build: pasangan key=value dipisah & (mis. a=1&b=2)", schema: { type: "string", example: "a=1&b=hello world" } },
        ],
        responses: { "200": { description: "Hasil parse/build" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const mode = String(req.query.mode)
        if (mode === "parse") {
            const qs = String(req.query.qs || "").replace(/^\?/, "")
            if (!qs) return res.json({ ok: true, params: {}, count: 0 })
            const params = {}
            for (const pair of qs.split("&")) {
                if (!pair) continue
                const [k, v] = pair.split("=").map(decodeURIComponent)
                if (params[k] === undefined) params[k] = v ?? ""
                else if (Array.isArray(params[k])) params[k].push(v ?? "")
                else params[k] = [params[k], v ?? ""]
            }
            res.json({ ok: true, input: qs, params, count: Object.keys(params).length })
        } else if (mode === "build") {
            const input = String(req.query.params || "")
            if (!input) return res.json({ ok: true, query_string: "", count: 0 })
            const params = {}
            for (const pair of input.split("&")) {
                if (!pair) continue
                const [k, v] = pair.split("=")
                params[k] = v ?? ""
            }
            const qs = new URLSearchParams(params).toString()
            res.json({ ok: true, params, query_string: qs, count: Object.keys(params).length })
        } else {
            res.status(400).json({ ok: false, error: "mode harus parse atau build" })
        }
    },
}

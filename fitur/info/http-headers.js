// /info/http-headers — Fetch HTTP headers of a URL
import axios from "axios"

export default {
    route: {
        method: "get",
        path: "/info/http-headers",
        auth: false,
        tags: ["Info"],
        summary: "Get HTTP headers of a URL",
        description: "Mengambil HTTP response headers dari sebuah URL. Berguna untuk cek server, cache, security headers.",
        parameters: [
            { name: "url", in: "query", required: true, description: "URL target", schema: { type: "string", example: "https://example.com" } },
        ],
        responses: { "200": { description: "Headers" }, "400": { description: "Parameter tidak valid" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const url = String(req.query.url || "").trim()
        if (!url) return res.status(400).json({ ok: false, error: "url wajib diisi" })
        if (!/^https?:\/\//i.test(url)) return res.status(400).json({ ok: false, error: "url harus diawali http:// atau https://" })
        try {
            const r = await axios.head(url, { timeout: 20000, maxRedirects: 5, validateStatus: () => true, headers: { "User-Agent": "Mozilla/5.0 (compatible; KangwifiAPI/1.0)" } })
            const headers = {}
            for (const [k, v] of Object.entries(r.headers)) headers[k.toLowerCase()] = v
            res.json({ ok: true, url, status: r.status, status_text: r.statusText, server: headers.server || null, content_type: headers["content-type"] || null, headers })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

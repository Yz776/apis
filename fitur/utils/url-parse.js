// /utils/url-parse — parse URL into components
export default {
    route: {
        method: "get",
        path: "/utils/url-parse",
        auth: false,
        tags: ["Utils"],
        summary: "Parse URL into components",
        description: "Pecah URL menjadi komponen: protocol, host, hostname, port, path, query, hash, dll.",
        parameters: [
            { name: "url", in: "query", required: true, description: "URL", schema: { type: "string", example: "https://example.com:8080/path/to/page?foo=bar&baz=qux#section" } },
        ],
        responses: { "200": { description: "Komponen URL" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const url = req.query.url
        if (!url) return res.status(400).json({ ok: false, error: "url wajib diisi" })
        try {
            const u = new URL(String(url))
            const params = {}
            u.searchParams.forEach((v, k) => {
                if (params[k] === undefined) params[k] = v
                else if (Array.isArray(params[k])) params[k].push(v)
                else params[k] = [params[k], v]
            })
            res.json({
                ok: true,
                input: String(url),
                href: u.href,
                protocol: u.protocol,
                username: u.username || null,
                password: u.password || null,
                host: u.host,
                hostname: u.hostname,
                port: u.port || null,
                pathname: u.pathname,
                search: u.search || null,
                hash: u.hash || null,
                origin: u.origin,
                query_params: params,
            })
        } catch (e) { res.status(400).json({ ok: false, error: "URL tidak valid: " + e.message }) }
    },
}

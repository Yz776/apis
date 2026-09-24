// /info/github-api — GitHub API v3 (Public, no auth: 60 req/hr per IP)
// Sumber: https://docs.github.com/en/rest
// Catatan: Tanpa token = 60 req/jam per IP; dengan token = 5000 req/jam
export default {
    route: {
        method: "get",
        path: "/info/github-api",
        auth: false,
        tags: ["Info", "Dev"],
        summary: "GitHub API (Public)",
        description: "Akses data publik GitHub: user, repo, commit, release, dll. Rate limit: 60 req/jam (tanpa token).",
        parameters: [
            { name: "endpoint", in: "query", required: true, description: "Endpoint GitHub (tanpa /api/v3): users/octocat, repos/octocat/Hello-World, repos/octocat/Hello-World/releases", schema: { type: "string", example: "users/octocat" } },
            { name: "per_page", in: "query", required: false, description: "Jumlah per halaman (max 100)", schema: { type: "integer", default: 30 } },
            { name: "page", in: "query", required: false, description: "Nomor halaman", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "Data GitHub" }, "403": { description: "Rate limit exceeded" }, "404": { description: "Tidak ditemukan" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const { endpoint, per_page = 30, page = 1 } = req.query
        if (!endpoint) return res.status(400).json({ ok: false, error: "endpoint wajib diisi (contoh: users/octocat)" })
        const url = new URL(`https://api.github.com/${endpoint}`)
        url.searchParams.set("per_page", String(Math.min(100, Math.max(1, per_page))))
        url.searchParams.set("page", String(page))
        try {
            const res2 = await fetch(url, {
                headers: { "user-agent": "Kangwifi-API/1.0", accept: "application/vnd.github+json" },
                signal: AbortSignal.timeout(15_000),
            })
            if (res2.status === 403) return res.status(403).json({ ok: false, error: "Rate limit GitHub (60 req/jam tanpa token)" })
            if (res2.status === 404) return res.status(404).json({ ok: false, error: "Tidak ditemukan" })
            const data = await res2.json()
            const link = res2.headers.get("link")
            res.json({ ok: true, source: "GitHub API", data, pagination: link })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}
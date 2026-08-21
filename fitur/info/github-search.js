// /info/github-search — GitHub repository search
import axios from "axios"
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ""
export default {
    route: {
        method: "get",
        path: "/info/github-search",
        auth: false,
        tags: ["Info"],
        summary: "GitHub repository search",
        description: "Cari repository di GitHub (rate-limited by GitHub. Set env GITHUB_TOKEN untuk rate limit lebih tinggi).",
        parameters: [
            { name: "q", in: "query", required: true, description: "Query pencarian", schema: { type: "string", example: "elysia bun" } },
            { name: "sort", in: "query", required: false, description: "Sort: stars, forks, updated (default best match)", schema: { type: "string", enum: ["stars", "forks", "updated"] } },
            { name: "order", in: "query", required: false, description: "Order: asc atau desc (default desc)", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
            { name: "per_page", in: "query", required: false, description: "Hasil per halaman (default 10, max 100)", schema: { type: "integer", default: 10 } },
        ],
        responses: { "200": { description: "Hasil pencarian" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const q = String(req.query.q || "").trim()
        if (!q) return res.status(400).json({ ok: false, error: "q wajib diisi" })
        try {
            const params = {
                q,
                per_page: Math.min(100, Math.max(1, parseInt(req.query.per_page) || 10)),
            }
            if (req.query.sort) params.sort = req.query.sort
            params.order = req.query.order || "desc"
            const headers = { "Accept": "application/vnd.github+json", "User-Agent": "kangwifi-api" }
            if (GITHUB_TOKEN) headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`
            const { data, status } = await axios.get("https://api.github.com/search/repositories", {
                params,
                headers,
                timeout: 15000,
                validateStatus: () => true,
            })
            if (status === 403 || status === 429) {
                return res.status(503).json({
                    ok: false,
                    error: `GitHub API rate-limited (HTTP ${status}). Coba lagi nanti atau set env GITHUB_TOKEN.`,
                    retryAfter: 60,
                })
            }
            if (status !== 200) return res.status(502).json({ ok: false, error: `GitHub API error ${status}: ${data?.message || "unknown"}` })
            const repos = (data.items || []).map(r => ({
                id: r.id,
                name: r.name,
                full_name: r.full_name,
                owner: r.owner?.login,
                description: r.description,
                url: r.html_url,
                homepage: r.homepage,
                language: r.language,
                stars: r.stargazers_count,
                forks: r.forks_count,
                watchers: r.watchers_count,
                open_issues: r.open_issues_count,
                license: r.license?.name || null,
                created_at: r.created_at,
                updated_at: r.updated_at,
                topics: r.topics || [],
                default_branch: r.default_branch,
            }))
            res.json({
                ok: true,
                total_count: data.total_count,
                returned: repos.length,
                repos,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message, status: e.response?.status }) }
    },
}

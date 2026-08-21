// /info/github-repo — GitHub repo info
import axios from "axios"

// Optional: set GITHUB_TOKEN env var to bypass 60 req/hour anonymous rate limit
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ""

export default {
    route: {
        method: "get",
        path: "/info/github-repo",
        auth: false,
        tags: ["Info"],
        summary: "GitHub repo info",
        description: "Mengambil informasi publik repository GitHub: deskripsi, stars, forks, license, dll. Set env GITHUB_TOKEN untuk rate limit lebih tinggi.",
        parameters: [
            { name: "owner", in: "query", required: true, description: "Owner repo", schema: { type: "string", example: "torvalds" } },
            { name: "repo", in: "query", required: true, description: "Nama repo", schema: { type: "string", example: "linux" } },
        ],
        responses: { "200": { description: "Info repo" }, "400": { description: "Parameter tidak valid" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const owner = String(req.query.owner || "").trim()
        const repo = String(req.query.repo || "").trim()
        if (!owner || !repo) return res.status(400).json({ ok: false, error: "owner dan repo wajib diisi" })
        try {
            const headers = {
                "User-Agent": "KangwifiAPI/1.0",
                "Accept": "application/vnd.github+json",
            }
            if (GITHUB_TOKEN) headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`

            const { data, status } = await axios.get(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
                timeout: 15000,
                headers,
                validateStatus: () => true,
            })
            if (status === 404) return res.status(404).json({ ok: false, error: "Repo tidak ditemukan" })
            if (status === 403 || status === 429) {
                const remaining = data?.message || "Rate limit exceeded"
                return res.status(503).json({
                    ok: false,
                    error: `GitHub API rate-limited (HTTP ${status}): ${remaining}. Coba lagi nanti atau set env GITHUB_TOKEN.`,
                    retryAfter: 60,
                })
            }
            if (status !== 200) return res.status(502).json({ ok: false, error: `GitHub API error ${status}: ${data?.message || "unknown"}` })
            res.json({
                ok: true,
                full_name: data.full_name,
                description: data.description,
                private: data.private,
                fork: data.fork,
                homepage: data.homepage,
                language: data.language,
                stars: data.stargazers_count,
                watchers: data.watchers_count,
                forks: data.forks_count,
                open_issues: data.open_issues_count,
                default_branch: data.default_branch,
                license: data.license?.spdx_id || null,
                topics: data.topics,
                created_at: data.created_at,
                updated_at: data.updated_at,
                pushed_at: data.pushed_at,
                size_kb: data.size,
                html_url: data.html_url,
                clone_url: data.clone_url,
                owner: { login: data.owner?.login, type: data.owner?.type, avatar_url: data.owner?.avatar_url },
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

// /info/github-user — GitHub user info
import axios from "axios"

export default {
    route: {
        method: "get",
        path: "/info/github-user",
        auth: false,
        tags: ["Info"],
        summary: "GitHub user info",
        description: "Mengambil informasi publik user GitHub: profil, jumlah repo, follower, bio, dll.",
        parameters: [
            { name: "username", in: "query", required: true, description: "Username GitHub", schema: { type: "string", example: "torvalds" } },
        ],
        responses: { "200": { description: "Info user" }, "400": { description: "Parameter tidak valid" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const u = String(req.query.username || "").trim()
        if (!u) return res.status(400).json({ ok: false, error: "username wajib diisi" })
        try {
            const { data, status } = await axios.get(`https://api.github.com/users/${encodeURIComponent(u)}`, {
                timeout: 15000,
                headers: { "User-Agent": "KangwifiAPI/1.0", "Accept": "application/vnd.github+json" },
                validateStatus: () => true,
            })
            if (status === 404) return res.status(404).json({ ok: false, error: "User tidak ditemukan" })
            if (status !== 200) return res.status(502).json({ ok: false, error: `GitHub API error ${status}` })
            res.json({
                ok: true,
                login: data.login,
                name: data.name,
                type: data.type,
                company: data.company,
                blog: data.blog,
                location: data.location,
                email: data.email,
                bio: data.bio,
                twitter: data.twitter_username,
                public_repos: data.public_repos,
                public_gists: data.public_gists,
                followers: data.followers,
                following: data.following,
                created_at: data.created_at,
                updated_at: data.updated_at,
                avatar_url: data.avatar_url,
                html_url: data.html_url,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

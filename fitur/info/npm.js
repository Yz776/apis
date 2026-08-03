// /info/npm — NPM package info
import axios from "axios"

export default {
    route: {
        method: "get",
        path: "/info/npm",
        auth: false,
        tags: ["Info"],
        summary: "NPM package info",
        description: "Mengambil informasi paket NPM: versi terbaru, deskripsi, license, maintainer, dll.",
        parameters: [
            { name: "name", in: "query", required: true, description: "Nama paket NPM", schema: { type: "string", example: "axios" } },
        ],
        responses: { "200": { description: "Info paket" }, "400": { description: "Parameter tidak valid" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const name = String(req.query.name || "").trim()
        if (!name) return res.status(400).json({ ok: false, error: "name wajib diisi" })
        try {
            const { data, status } = await axios.get(`https://registry.npmjs.org/${encodeURIComponent(name)}`, {
                timeout: 15000,
                headers: { "User-Agent": "Mozilla/5.0" },
                validateStatus: () => true,
            })
            if (status === 404) return res.status(404).json({ ok: false, error: "Paket tidak ditemukan" })
            if (status !== 200) return res.status(502).json({ ok: false, error: `NPM API error ${status}` })
            const latest = data["dist-tags"]?.latest
            const latestVer = latest ? data.versions?.[latest] : null
            res.json({
                ok: true,
                name: data.name,
                description: latestVer?.description || data.description,
                latest_version: latest,
                license: latestVer?.license || null,
                homepage: latestVer?.homepage || null,
                repository: latestVer?.repository?.url || null,
                main: latestVer?.main || null,
                keywords: latestVer?.keywords || [],
                maintainers: (latestVer?.maintainers || []).map(m => m.name),
                dependencies_count: latestVer?.dependencies ? Object.keys(latestVer.dependencies).length : 0,
                created: data.time?.created,
                modified: data.time?.modified,
                total_versions: Object.keys(data.versions || {}).length,
                npm_url: `https://www.npmjs.com/package/${data.name}`,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

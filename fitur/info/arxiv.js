// /info/arxiv — arXiv paper search
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/arxiv",
        auth: false,
        tags: ["Info"],
        summary: "arXiv paper search",
        description: "Cari paper ilmiah di arXiv. Mengembalikan metadata paper (judul, penulis, abstrak, link PDF).",
        parameters: [
            { name: "q", in: "query", required: true, description: "Query pencarian", schema: { type: "string", example: "transformer attention" } },
            { name: "max", in: "query", required: false, description: "Maksimum hasil (default 10, max 50)", schema: { type: "integer", default: 10 } },
        ],
        responses: { "200": { description: "Daftar paper" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const q = String(req.query.q || "").trim()
        if (!q) return res.status(400).json({ ok: false, error: "q wajib diisi" })
        try {
            const max = Math.min(50, Math.max(1, parseInt(req.query.max) || 10))
            const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&max_results=${max}`
            const { data } = await axios.get(url, { timeout: 15000 })
            // simple XML parse using regex
            const entries = []
            const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
            let match
            while ((match = entryRegex.exec(data)) !== null) {
                const block = match[1]
                const get = (tag) => {
                    const m = block.match(new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`))
                    return m ? m[1].trim() : null
                }
                const title = get("title")?.replace(/\n/g, " ").replace(/\s+/g, " ")
                const summary = get("summary")?.replace(/\n/g, " ").replace(/\s+/g, " ")
                const published = get("published")
                const updated = get("updated")
                const id = get("id")
                const authors = []
                const authorRegex = /<name>([\s\S]*?)<\/name>/g
                let aMatch
                while ((aMatch = authorRegex.exec(block)) !== null) authors.push(aMatch[1].trim())
                const pdfMatch = block.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/)
                entries.push({
                    id,
                    title,
                    summary,
                    authors,
                    published,
                    updated,
                    pdf_url: pdfMatch ? pdfMatch[1] : null,
                    arxiv_url: id,
                })
            }
            res.json({
                ok: true,
                query: q,
                returned: entries.length,
                papers: entries,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

// /info/books — Open Library book search
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/books",
        auth: false,
        tags: ["Info"],
        summary: "Book search (Open Library)",
        description: "Cari buku berdasarkan judul/penulis via Open Library API.",
        parameters: [
            { name: "q", in: "query", required: true, description: "Query pencarian", schema: { type: "string", example: "harry potter" } },
            { name: "limit", in: "query", required: false, description: "Maksimum hasil (default 10, max 100)", schema: { type: "integer", default: 10 } },
        ],
        responses: { "200": { description: "Daftar buku" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const q = String(req.query.q || "").trim()
        if (!q) return res.status(400).json({ ok: false, error: "q wajib diisi" })
        try {
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10))
            const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${limit}`
            const { data } = await axios.get(url, { timeout: 15000 })
            const books = (data.docs || []).map(b => ({
                title: b.title,
                authors: b.author_name || [],
                first_publish_year: b.first_publish_year,
                isbn: b.isbn?.[0] || null,
                cover: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
                language: b.language || [],
                edition_count: b.edition_count,
                ebook: b.ia ? true : false,
                preview_url: b.ia?.[0] ? `https://archive.org/details/${b.ia[0]}` : null,
            }))
            res.json({
                ok: true,
                total_found: data.numFound,
                returned: books.length,
                books,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

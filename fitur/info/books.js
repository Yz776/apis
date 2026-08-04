// /info/books — Book search (Google Books + Internet Archive + Open Library)
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/books",
        auth: false,
        tags: ["Info"],
        summary: "Book search (multi-source)",
        description: "Cari buku berdasarkan judul/penulis. Sumber: Google Books API → Internet Archive Advanced Search → Open Library (fallback berurutan).",
        parameters: [
            { name: "q", in: "query", required: true, description: "Query pencarian", schema: { type: "string", example: "harry potter" } },
            { name: "limit", in: "query", required: false, description: "Maksimum hasil (default 10, max 100)", schema: { type: "integer", default: 10 } },
        ],
        responses: { "200": { description: "Daftar buku" }, "400": { description: "Parameter tidak valid" }, "404": { description: "Buku tidak ditemukan" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const q = String(req.query.q || "").trim()
        if (!q) return res.status(400).json({ ok: false, error: "q wajib diisi" })
        try {
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10))

            let books = []
            let totalFound = 0
            let source = null

            // Source 1: Google Books API
            try {
                const { data: gb, status } = await axios.get("https://www.googleapis.com/books/v1/volumes", {
                    params: { q, maxResults: limit, printType: "books" },
                    timeout: 8000,
                    headers: { "User-Agent": "Mozilla/5.0" },
                    validateStatus: () => true,
                })
                if (status === 200 && gb?.items?.length) {
                    source = "google-books"
                    books = gb.items.map(item => {
                        const v = item.volumeInfo || {}
                        return {
                            title: v.title,
                            authors: v.authors || [],
                            first_publish_year: v.publishedDate ? parseInt(v.publishedDate.slice(0, 4)) : null,
                            isbn: v.industryIdentifiers?.find(i => i.type === "ISBN_13")?.identifier
                                || v.industryIdentifiers?.find(i => i.type === "ISBN_10")?.identifier
                                || null,
                            cover: v.imageLinks?.thumbnail?.replace(/^http:/, "https:")
                                || v.imageLinks?.smallThumbnail?.replace(/^http:/, "https:")
                                || null,
                            language: v.language ? [v.language] : [],
                            publisher: v.publisher || null,
                            description: v.description || null,
                            page_count: v.pageCount || null,
                            categories: v.categories || [],
                            rating: v.averageRating || null,
                            rating_count: v.ratingsCount || null,
                            preview_url: v.previewLink || v.infoLink || null,
                            source: "google-books",
                        }
                    })
                    totalFound = gb.totalItems || books.length
                }
            } catch {}

            // Source 2: Internet Archive Advanced Search (more reliable than Open Library)
            if (!books.length) {
                try {
                    const { data: ia, status } = await axios.get("https://archive.org/advancedsearch.php", {
                        params: {
                            q: `(${q}) AND mediatype:(texts)`,
                            fl: ["identifier", "title", "creator", "year", "description", "subject", "language"],
                            sort: ["downloads desc"],
                            rows: limit,
                            output: "json",
                        },
                        timeout: 12000,
                        headers: { "User-Agent": "Mozilla/5.0" },
                        validateStatus: () => true,
                    })
                    if (status === 200 && ia?.response?.docs?.length) {
                        source = "archive.org"
                        books = ia.response.docs.map(d => ({
                            title: Array.isArray(d.title) ? d.title[0] : d.title,
                            authors: d.creator ? (Array.isArray(d.creator) ? d.creator : d.creator.split(";").map(s => s.trim())) : [],
                            first_publish_year: d.year ? parseInt(String(d.year).slice(0, 4)) : null,
                            isbn: null,
                            cover: d.identifier ? `https://archive.org/services/img/${d.identifier}` : null,
                            language: d.language ? (Array.isArray(d.language) ? d.language : [d.language]) : [],
                            publisher: null,
                            description: Array.isArray(d.description) ? d.description[0] : (d.description || null),
                            page_count: null,
                            categories: d.subject ? (Array.isArray(d.subject) ? d.subject.slice(0, 5) : [d.subject]) : [],
                            rating: null,
                            rating_count: null,
                            preview_url: d.identifier ? `https://archive.org/details/${d.identifier}` : null,
                            source: "archive.org",
                        }))
                        totalFound = ia.response.numFound || books.length
                    }
                } catch {}
            }

            // Source 3: Open Library (last resort - sometimes slow/down)
            if (!books.length) {
                try {
                    const { data: ol, status } = await axios.get("https://openlibrary.org/search.json", {
                        params: { q, limit },
                        timeout: 6000,
                        headers: { "User-Agent": "Mozilla/5.0" },
                        validateStatus: () => true,
                    })
                    if (status === 200 && ol?.docs?.length) {
                        source = "openlibrary.org"
                        books = ol.docs.map(b => ({
                            title: b.title,
                            authors: b.author_name || [],
                            first_publish_year: b.first_publish_year || null,
                            isbn: b.isbn?.[0] || null,
                            cover: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
                            language: b.language || [],
                            publisher: b.publisher?.[0] || null,
                            description: null,
                            page_count: null,
                            categories: b.subject ? b.subject.slice(0, 5) : [],
                            rating: null,
                            rating_count: null,
                            preview_url: b.ia?.[0] ? `https://archive.org/details/${b.ia[0]}` : null,
                            source: "openlibrary.org",
                        }))
                        totalFound = ol.numFound || books.length
                    }
                } catch {}
            }

            if (!books.length) {
                return res.status(404).json({
                    ok: false,
                    error: "Buku tidak ditemukan di Google Books, Internet Archive, maupun Open Library",
                })
            }

            res.json({
                ok: true,
                total_found: totalFound,
                returned: books.length,
                source,
                query: q,
                books,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

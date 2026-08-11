import axios from "axios"

const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36"

// ── Konfigurasi proxy nhentai ──
// Proxy Cloudflare Worker yang mem-forward request ke nhentai.net API
// Jika proxy utama down/blocked, fallback ke proxy alternatif
const PROXY_URLS = [
    "https://nhentai-proxy-v2.teknikisi255.workers.dev",
    // Tambah proxy lain jika ada
]

// ── Fetch gallery detail via proxy ──
async function fetchGallery(proxyBase, id) {
    const urls = [
        `${proxyBase}/api/g/${id}`,
        `${proxyBase}/api/v2/gallery/${id}`,
        `${proxyBase}/g/${id}`,
    ]
    for (const url of urls) {
        try {
            const { data, status } = await axios.get(url, {
                headers: { "User-Agent": UA, "Accept": "application/json" },
                timeout: 12000,
                validateStatus: () => true
            })
            if (status === 200 && data && typeof data === "object" && !data.ok) {
                return data
            }
        } catch { /* try next */ }
    }
    return null
}

// ── Search galleries via proxy ──
async function searchGalleries(proxyBase, query, page = 1) {
    // Coba berbagai format URL search yang didukung proxy
    const urls = [
        // v2 API format
        `${proxyBase}/api/v2/galleries/search?query=${encodeURIComponent(query)}&page=${page}`,
        // v1 API format
        `${proxyBase}/api/galleries/search?query=${encodeURIComponent(query)}&page=${page}`,
        // Query string format
        `${proxyBase}/search?q=${encodeURIComponent(query)}&page=${page}`,
    ]

    for (const url of urls) {
        try {
            const { data, status } = await axios.get(url, {
                headers: { "User-Agent": UA, "Accept": "application/json" },
                timeout: 15000,
                validateStatus: () => true
            })

            // Proxy return "bad url" = format tidak didukung
            if (data === "bad url" || (typeof data === "string" && data.includes("bad url"))) continue
            // Proxy return health check = bukan search result
            if (data?.ok === true && data?.v) continue
            // Cloudflare block
            if (status === 403 || status === 503) continue

            if (status === 200 && data && typeof data === "object") {
                // v1 format: { result: [...], num_pages, per_page }
                // v2 format: { data: { result: [...] }, pagination: {...} }
                const results = data?.data?.result || data?.result || data?.galleries || []
                if (results.length > 0 || data?.num_pages !== undefined) {
                    return {
                        source: url,
                        results,
                        numPages: data?.data?.pagination?.num_pages || data?.num_pages || null,
                        perPage: data?.data?.pagination?.per_page || data?.per_page || null,
                    }
                }
                // Maybe it's the raw result array
                if (Array.isArray(data)) {
                    return { source: url, results: data, numPages: null, perPage: null }
                }
            }
        } catch { /* try next */ }
    }

    // Juga coba POST format
    try {
        const { data, status } = await axios.post(`${proxyBase}/search`, {
            query, page
        }, {
            headers: { "User-Agent": UA, "Accept": "application/json", "Content-Type": "application/json" },
            timeout: 15000,
            validateStatus: () => true
        })

        if (status === 200 && data && typeof data === "object" && !data.ok) {
            const results = data?.data?.result || data?.result || data?.galleries || []
            if (results.length > 0 || Array.isArray(data)) {
                return {
                    source: `${proxyBase}/search (POST)`,
                    results: Array.isArray(data) ? data : results,
                    numPages: data?.data?.pagination?.num_pages || data?.num_pages || null,
                    perPage: data?.data?.pagination?.per_page || data?.per_page || null,
                }
            }
        }
    } catch { /* fallback */ }

    return null
}

function badRequest(msg) {
    const err = new Error(msg)
    err.status = 400
    return err
}

export default {
    route: {
        method: "get",
        path: "/search/nhentai",
        auth: false,
        tags: ["Search"],
        summary: "Cari galeri nhentai via Cloudflare Worker proxy",
        description: "Mencari galeri nhentai berdasarkan keyword melalui proxy Cloudflare Worker (nhentai-proxy-v2.teknikisi255.workers.dev). Juga bisa ambil detail galeri by ID. Proxy mungkin bermasalah karena konfigurasi Cloudflare — jika search return error, coba lagi nanti atau gunakan parameter id untuk akses langsung.",
        parameters: [
            {
                name: "q",
                in: "query",
                required: false,
                description: "Keyword pencarian (tag, judul, dll)",
                schema: { type: "string", example: "naruto" }
            },
            {
                name: "id",
                in: "query",
                required: false,
                description: "ID galeri nhentai (untuk ambil detail 1 galeri)",
                schema: { type: "integer", example: 177013 }
            },
            {
                name: "page",
                in: "query",
                required: false,
                description: "Nomor halaman hasil pencarian (default: 1)",
                schema: { type: "integer", example: 1 }
            },
            {
                name: "proxy",
                in: "query",
                required: false,
                description: "Index proxy (0 = default). Gunakan jika ada beberapa proxy",
                schema: { type: "integer", example: 0 }
            }
        ],
        responses: {
            "200": {
                description: "Berhasil",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean", example: true },
                                result: {
                                    type: "object",
                                    properties: {
                                        query: { type: "string" },
                                        results: { type: "array" },
                                        proxy: { type: "string" },
                                        page: { type: "integer" }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "400": {
                description: "Parameter tidak valid",
                content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } }
            },
            "500": {
                description: "Kesalahan server / proxy tidak bisa diakses",
                content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } }
            }
        }
    },

    handler: async (req, res) => {
        const { q, id, page = "1", proxy = "0" } = req.query
        const pageNum = Math.max(1, parseInt(page) || 1)
        const proxyIdx = Math.max(0, parseInt(proxy) || 0)

        if (!q && !id) {
            return res.status(400).json({
                ok: false,
                error: "Isi parameter 'q' (keyword pencarian) atau 'id' (ID galeri). Contoh: ?q=naruto atau ?id=177013"
            })
        }

        // Pilih proxy
        const proxyBase = PROXY_URLS[proxyIdx] || PROXY_URLS[0]

        // ── Mode: Detail galeri by ID ──
        if (id) {
            const galleryId = parseInt(id)
            if (isNaN(galleryId) || galleryId <= 0) {
                return res.status(400).json({ ok: false, error: "Parameter 'id' harus berupa angka positif" })
            }

            const result = await fetchGallery(proxyBase, galleryId)
            if (!result) {
                return res.status(404).json({
                    ok: false,
                    error: `Galeri #${galleryId} tidak ditemukan atau proxy tidak bisa mengakses nhentai API`,
                    proxy: proxyBase,
                    hint: "Proxy mungkin sedang bermasalah (Cloudflare block / konfigurasi). Coba lagi nanti."
                })
            }

            return res.json({
                ok: true,
                result: {
                    id: galleryId,
                    gallery: result,
                    proxy: proxyBase
                }
            })
        }

        // ── Mode: Search by keyword ──
        const searchResult = await searchGalleries(proxyBase, q, pageNum)
        if (!searchResult) {
            return res.status(500).json({
                ok: false,
                error: `Pencarian "${q}" gagal — proxy tidak bisa mengakses nhentai search API`,
                proxy: proxyBase,
                hint: "Proxy nhentai-proxy-v2 saat ini bermasalah (search return 'bad url'). Ini kemungkinan masalah konfigurasi Cloudflare Worker (ORIGIN_URL tidak diset). Hubungi owner proxy untuk perbaikan."
            })
        }

        return res.json({
            ok: true,
            result: {
                query: q,
                page: pageNum,
                numPages: searchResult.numPages,
                perPage: searchResult.perPage,
                results: searchResult.results,
                proxy: proxyBase,
                source: searchResult.source
            }
        })
    }
}

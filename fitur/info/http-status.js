// /info/http-status — HTTP status code reference
const STATUS = {
    100: { name: "Continue", category: "1xx Informational", desc: "Server menerima request header, klien harus kirim body." },
    101: { name: "Switching Protocols", category: "1xx Informational", desc: "Klien minta switch protocol via Upgrade header." },
    200: { name: "OK", category: "2xx Success", desc: "Request berhasil." },
    201: { name: "Created", category: "2xx Success", desc: "Resource baru berhasil dibuat." },
    202: { name: "Accepted", category: "2xx Success", desc: "Request diterima, diproses asynchronous." },
    204: { name: "No Content", category: "2xx Success", desc: "Berhasil tapi tidak ada body." },
    206: { name: "Partial Content", category: "2xx Success", desc: "Server mengirim sebagian resource (Range request)." },
    301: { name: "Moved Permanently", category: "3xx Redirection", desc: "URL dipindah permanen." },
    302: { name: "Found", category: "3xx Redirection", desc: "URL dipindah sementara." },
    304: { name: "Not Modified", category: "3xx Redirection", desc: "Cached version masih valid." },
    307: { name: "Temporary Redirect", category: "3xx Redirection", desc: "Redirect sementara, method HTTP dipertahankan." },
    308: { name: "Permanent Redirect", category: "3xx Redirection", desc: "Redirect permanen, method dipertahankan." },
    400: { name: "Bad Request", category: "4xx Client Error", desc: "Request tidak valid (syntax/parameter)." },
    401: { name: "Unauthorized", category: "4xx Client Error", desc: "Butuh autentikasi." },
    403: { name: "Forbidden", category: "4xx Client Error", desc: "Server menolak akses." },
    404: { name: "Not Found", category: "4xx Client Error", desc: "Resource tidak ditemukan." },
    405: { name: "Method Not Allowed", category: "4xx Client Error", desc: "HTTP method tidak didukung." },
    408: { name: "Request Timeout", category: "4xx Client Error", desc: "Klien terlalu lambat mengirim." },
    409: { name: "Conflict", category: "4xx Client Error", desc: "Konflik state (mis. duplikat)." },
    410: { name: "Gone", category: "4xx Client Error", desc: "Resource permanen dihapus." },
    418: { name: "I'm a Teapot", category: "4xx Client Error", desc: "Easter egg RFC 2324." },
    422: { name: "Unprocessable Entity", category: "4xx Client Error", desc: "Syntactically valid tapi semantically wrong." },
    429: { name: "Too Many Requests", category: "4xx Client Error", desc: "Rate limit terlampaui." },
    500: { name: "Internal Server Error", category: "5xx Server Error", desc: "Error tak terduga di server." },
    501: { name: "Not Implemented", category: "5xx Server Error", desc: "Method tidak dikenal." },
    502: { name: "Bad Gateway", category: "5xx Server Error", desc: "Upstream mengirim respons invalid." },
    503: { name: "Service Unavailable", category: "5xx Server Error", desc: "Server overload/maintenance." },
    504: { name: "Gateway Timeout", category: "5xx Server Error", desc: "Upstream tidak merespons." },
    511: { name: "Network Authentication Required", category: "5xx Server Error", desc: "Butuh login jaringan (captive portal)." },
}

export default {
    route: {
        method: "get",
        path: "/info/http-status",
        auth: false,
        tags: ["Info"],
        summary: "HTTP status code reference",
        description: "Referensi kode status HTTP. Tanpa parameter = daftar semua. code=N = info kode N.",
        parameters: [
            { name: "code", in: "query", required: false, description: "Kode HTTP spesifik (mis. 404)", schema: { type: "integer", example: 404 } },
        ],
        responses: { "200": { description: "Info status" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        if (!req.query.code) {
            return res.json({ ok: true, total: Object.keys(STATUS).length, status_codes: STATUS })
        }
        const c = parseInt(req.query.code, 10)
        if (!STATUS[c]) return res.status(400).json({ ok: false, error: `Kode ${c} tidak ditemukan di database` })
        res.json({ ok: true, code: c, ...STATUS[c] })
    },
}

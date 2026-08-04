import axios from "axios"

const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"

const providers = {
    tinyurl: async (url, custom) => {
        // Only include alias when custom is a non-empty string — empty alias causes 422
        let endpoint = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`
        if (custom && custom.trim()) {
            endpoint += `&alias=${encodeURIComponent(custom.trim())}`
        }
        const res = await axios.get(endpoint, {
            headers: { "User-Agent": ua, "Accept-Encoding": "gzip" },
            timeout: 10000,
            validateStatus: () => true,
        })
        if (res.status >= 400) {
            const body = typeof res.data === "string" ? res.data : JSON.stringify(res.data)
            throw new Error(`TinyURL error ${res.status}: ${body.slice(0, 200)}`)
        }
        return res.data.trim()
    },

    spoome: async (url, custom) => {
        let endpoint = `https://spoo.me/?url=${encodeURIComponent(url)}`
        if (custom && custom.trim()) {
            endpoint += `&alias=${encodeURIComponent(custom.trim())}`
        }
        const res = await axios.post(endpoint, null, {
            headers: {
                "User-Agent": ua,
                "Accept-Encoding": "gzip",
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json"
            },
            timeout: 10000,
            validateStatus: () => true,
        })
        if (res.status >= 400 || !res.data?.short_url) {
            const msg = res.data?.error || res.data?.message || `HTTP ${res.status}`
            throw new Error(`SpooMe error: ${msg}`)
        }
        return res.data.short_url
    },

    referis: async (url) => {
        if (!url.startsWith("https://")) throw new Error("URL harus diawali https://")
        const { data } = await axios.post("https://refer.is/_root.data?index",
            new URLSearchParams({ source: "homepage", url, action: "shorten" }).toString(),
            {
                headers: {
                    "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
                    origin: "https://refer.is",
                    referer: "https://refer.is/",
                    "user-agent": ua
                },
                timeout: 10000,
                validateStatus: () => true,
            }
        )
        if (!data?.[9]) throw new Error("refer.is gagal (format respons tidak valid)")
        return data[9]
    },

    isgd: async (url, custom) => {
        let endpoint = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`
        if (custom && custom.trim()) {
            endpoint += `&shorturl=${encodeURIComponent(custom.trim())}`
        }
        const res = await axios.get(endpoint, {
            headers: { "User-Agent": ua },
            timeout: 10000,
            validateStatus: () => true,
        })
        if (res.status >= 400 || (typeof res.data === "string" && res.data.startsWith("Error:"))) {
            throw new Error(`is.gd error: ${typeof res.data === "string" ? res.data : `HTTP ${res.status}`}`)
        }
        return res.data.trim()
    },

    vurl: async (url) => {
        const { data } = await axios.get(`https://vurl.com/api.php?url=${encodeURIComponent(url)}`, {
            timeout: 10000,
            validateStatus: () => true,
        })
        if (typeof data !== "string" || !data.startsWith("http")) {
            throw new Error("vURL error: respons tidak valid")
        }
        return data.trim()
    },
}

export default {
    route: {
        method: "get",
        path: "/tools/shorturl",
        auth: false,
        tags: ["Tools"],
        summary: "Short URL",
        description: "Persingkat URL menggunakan berbagai provider pilihan.",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL yang ingin dipersingkat",
                schema: { type: "string", example: "https://example.com/halaman-yang-sangat-panjang" }
            },
            {
                name: "provider",
                in: "query",
                required: false,
                description: "Provider shortener yang digunakan",
                schema: { type: "string", enum: ["tinyurl", "spoome", "referis", "isgd", "vurl"], default: "tinyurl" }
            },
            {
                name: "custom",
                in: "query",
                required: false,
                description: "Nama custom untuk short URL (tidak semua provider mendukung)",
                schema: { type: "string", example: "namaku" }
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
                                provider: { type: "string", example: "tinyurl" },
                                original: { type: "string" },
                                short: { type: "string", example: "https://tinyurl.com/namaku" }
                            }
                        }
                    }
                }
            },
            "400": {
                description: "Request tidak valid",
                content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } }
            },
            "500": {
                description: "Kesalahan server / provider",
                content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } }
            }
        }
    },

    handler: async (req, res) => {
        const { url, provider = "tinyurl", custom } = req.query
        if (!url) return res.status(400).json({ ok: false, error: "url wajib diisi" })
        if (!providers[provider]) {
            return res.status(400).json({ ok: false, error: `provider tidak valid, pilih: ${Object.keys(providers).join(", ")}` })
        }
        try {
            const short = await providers[provider](url, custom || "")
            res.json({ ok: true, provider, original: url, short })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

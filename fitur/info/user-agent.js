// /info/user-agent — User-Agent parser
import axios from "axios"

export default {
    route: {
        method: "get",
        path: "/info/user-agent",
        auth: false,
        tags: ["Info"],
        summary: "User-Agent parser",
        description: "Parse string User-Agent menjadi browser, OS, device. Tanpa parameter = UA pengirim.",
        parameters: [
            { name: "ua", in: "query", required: false, description: "User-Agent string (default: UA pengirim)", schema: { type: "string", example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36" } },
        ],
        responses: { "200": { description: "Hasil parse" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const ua = String(req.query.ua || req.headers["user-agent"] || "")
        if (!ua) return res.status(400).json({ ok: false, error: "ua wajib diisi (atau kirim via User-Agent header)" })
        try {
            const { data } = await axios.get("https://api.apicagent.com", { params: { ua }, timeout: 15000 })
            res.json({
                ok: true,
                ua,
                browser: data.browser ? { name: data.browser.name, version: data.browser.major } : null,
                os: data.os ? { name: data.os.name, version: data.os.version } : null,
                device: data.device ? { type: data.device.type, brand: data.device.brand, model: data.device.model } : { type: "desktop" },
                engine: data.engine ? { name: data.engine.name, version: data.engine.version } : null,
            })
        } catch (e) {
            // Fallback: simple regex-based parse
            const browser = /Edg\/(\d+)/.test(ua) ? { name: "Edge", version: ua.match(/Edg\/(\d+)/)?.[1] }
                : /Chrome\/(\d+)/.test(ua) ? { name: "Chrome", version: ua.match(/Chrome\/(\d+)/)?.[1] }
                : /Firefox\/(\d+)/.test(ua) ? { name: "Firefox", version: ua.match(/Firefox\/(\d+)/)?.[1] }
                : /Safari\/(\d+)/.test(ua) ? { name: "Safari", version: ua.match(/Version\/(\d+)/)?.[1] }
                : { name: "Unknown", version: null }
            const os = /Windows NT 10/.test(ua) ? { name: "Windows", version: "10/11" }
                : /Mac OS X/.test(ua) ? { name: "macOS", version: (ua.match(/Mac OS X (\d+[._]\d+)/) || [])[1] }
                : /Android (\d+)/.test(ua) ? { name: "Android", version: ua.match(/Android (\d+)/)?.[1] }
                : /iPhone OS (\d+)/.test(ua) ? { name: "iOS", version: ua.match(/iPhone OS (\d+)/)?.[1] }
                : /Linux/.test(ua) ? { name: "Linux", version: null }
                : { name: "Unknown", version: null }
            res.json({ ok: true, ua, browser, os, device: { type: /mobile|android|iphone/i.test(ua) ? "mobile" : "desktop" }, engine: null, fallback: true })
        }
    },
}

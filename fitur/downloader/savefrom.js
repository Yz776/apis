import crypto from "crypto"
import vm from "vm"

const SALT = "b7944d7a59c9cb654228624880e7de59a53842c2d912b449fdf11febcf81cb21"

const DEFAULT_HEADERS = {
    "accept": "*/*",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "en-US,en;q=0.9",
    "sec-ch-ua": '"Google Chrome";v="117", "Not;A=Brand";v="8", "Chromium";v="117"',
    "sec-ch-ua-mobile": "?0",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
}

function generateHash(url, ts) {
    const data = url + ts + SALT
    return crypto.createHash("sha256").update(data).digest("hex")
}

function parseResult(raw) {
    const title = raw.meta?.title || "Untitled Video"
    const duration = raw.meta?.duration || "Unknown"
    const thumbnail = raw.thumb || ""
    const source = raw.meta?.source || ""
    const hosting = raw.hosting || "unknown"

    const downloads = []

    if (Array.isArray(raw.url)) {
        raw.url.forEach(item => {
            if (item.url) {
                downloads.push({
                    url: item.url,
                    quality: item.quality ? `${item.quality}p` : (item.subname || "default"),
                    format: item.ext || item.type || "mp4",
                    audio: item.audio !== false,
                    size: item.filesize || null,
                    name: `${item.name || "Video"} (${item.quality || item.subname || "SD"})`
                })
            }
        })
    }

    if (raw.stream) {
        Object.keys(raw.stream).forEach(format => {
            const qualities = raw.stream[format]
            Object.keys(qualities).forEach(quality => {
                const item = qualities[quality]
                if (item.url && item.url !== "#local-converter") {
                    downloads.push({
                        url: item.url,
                        quality: quality.includes("p") || quality.includes("k") ? quality : `${quality}p`,
                        format,
                        audio: !item.no_audio,
                        size: item.filesize || null,
                        name: `${format.toUpperCase()} (${quality})`
                    })
                }
            })
        })
    }

    return { title, duration, thumbnail, source, hosting, downloads }
}

async function scrapeSaveFrom(url) {
    const ts = Date.now()
    const form = new URLSearchParams({
        sf_url: url,
        sf_submit: "",
        new: "2",
        lang: "en",
        app: "",
        country: "en",
        os: "Windows",
        browser: "Chrome",
        channel: "main",
        "sf-nomad": "1",
        url,
        ts,
        _ts: 1720433117117,
        _tsc: 0,
        _s: generateHash(url, ts),
        _x: 1
    })

    const response = await fetch("https://worker.savefrom.net/savefrom.php", {
        method: "POST",
        headers: {
            ...DEFAULT_HEADERS,
            "content-type": "application/x-www-form-urlencoded",
            origin: "https://en.savefrom.net",
            referer: "https://en.savefrom.net/"
        },
        body: form
    })

    if (!response.ok) {
        throw new Error(`SaveFrom server returned HTTP error: ${response.status} ${response.statusText}`)
    }

    const jsResponse = await response.text()

    let resultData = null
    let errorMessage = null

    const sfMock = {
        videoResult: {
            show: (res) => { resultData = res },
            showRows: (res) => { resultData = res }
        },
        finishRequest: () => {},
        enableElement: () => {},
        result: {
            show: (res) => {
                if (res && res.success === false) {
                    errorMessage = res.html || "Download links not found"
                } else {
                    resultData = res
                }
            },
            showEmptyResult: (res) => {
                errorMessage = (res && res.html) || "Download link not found"
            }
        }
    }

    const context = {
        window: null,
        location: { hostname: "en.savefrom.net" },
        frameElement: {},
        atob: (base64) => Buffer.from(base64, "base64").toString(),
        _decodeURIComponent: (uri) => decodeURIComponent(uri)
    }

    context.window = context
    context.parent = {
        sf: sfMock,
        document: {
            location: { hostname: "en.savefrom.net" },
            getElementById: () => ({ innerHTML: "mock" }),
            body: {
                firstChild: null,
                removeChild: () => {}
            }
        }
    }
    context.document = context.parent.document

    vm.createContext(context)
    const script = new vm.Script(`decodeURIComponent=_decodeURIComponent;${jsResponse}`)
    script.runInContext(context)

    if (errorMessage) {
        throw new Error(errorMessage.replace(/<[^>]*>/g, ""))
    }

    if (!resultData) {
        throw new Error("Could not parse download links from SaveFrom response")
    }

    return parseResult(resultData)
}

export default {
    route: {
        method: "get",
        path: "/downloader/savefrom",
        auth: false,
        tags: ["Downloader"],
        summary: "Download video via SaveFrom",
        description: "Mengunduh video dari berbagai platform (YouTube, TikTok, Instagram, dll.) melalui SaveFrom. Menggunakan hash SHA-256 untuk validasi dan VM evaluation untuk parsing response.",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL video (YouTube, TikTok, Instagram, dll.)",
                schema: { type: "string", example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
            }
        ],
        responses: {
            "200": {
                description: "OK",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean" },
                                result: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        duration: { type: "string" },
                                        thumbnail: { type: "string" },
                                        source: { type: "string" },
                                        hosting: { type: "string" },
                                        downloads: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    url: { type: "string" },
                                                    quality: { type: "string" },
                                                    format: { type: "string" },
                                                    audio: { type: "boolean" },
                                                    size: { type: "integer", nullable: true },
                                                    name: { type: "string" }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    handler: async (req, res) => {
        const { url } = req.query
        if (!url) return res.status(400).json({ ok: false, error: "url wajib diisi" })
        try {
            const result = await scrapeSaveFrom(url)
            res.json({ ok: true, result })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

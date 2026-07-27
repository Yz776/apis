async function tiktokDirect(tiktokUrl) {
    const fetchOptions = {
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.google.com/"
        }
    }

    let res = await fetch(tiktokUrl, fetchOptions)
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
    }

    let finalUrl = res.url
    let html = await res.text()

    // Jika final URL adalah photo, rewrite ke video path
    if (finalUrl.includes("/photo/")) {
        finalUrl = finalUrl.replace("/photo/", "/video/")
        res = await fetch(finalUrl, fetchOptions)
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`)
        }
        html = await res.text()
    }

    // Extract rehydration/state JSON dari script tags
    const jsonMatch = html.match(/<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/) ||
                      html.match(/<script[^>]*id="__UNIVERSAL_DATA_FOR_WEB_"[^>]*>([\s\S]*?)<\/script>/)

    if (!jsonMatch) {
        throw new Error("Gagal menemukan data JSON di halaman TikTok")
    }

    const data = JSON.parse(jsonMatch[1])
    const scope = data.__DEFAULT_SCOPE__ || {}

    // Locate video-detail scope dynamically
    const detailKey = Object.keys(scope).find(key => key.includes("video-detail"))
    if (!detailKey) {
        throw new Error("Gagal menemukan detail video di halaman")
    }

    const detailData = scope[detailKey] || {}
    const itemStruct = detailData.itemInfo?.itemStruct
    if (!itemStruct) {
        throw new Error("Gagal menemukan item info video")
    }

    const isVideo = !itemStruct.imagePost
    const music = itemStruct.music || {}
    const stats = itemStruct.stats || {}
    const author = itemStruct.author || {}

    // Extract images jika slideshow
    let images = []
    if (!isVideo) {
        const rawImages = itemStruct.imagePost?.images || []
        images = rawImages.map(img => img.imageURL?.urlList?.[0]).filter(Boolean)
    }

    return {
        id: itemStruct.id,
        title: itemStruct.desc || "",
        type: isVideo ? "video" : "photo",
        cover: itemStruct.video?.coverHD || itemStruct.video?.coverAddr || itemStruct.video?.dynamicCover || null,
        originCover: itemStruct.video?.coverAddr || null,
        videoUrl: isVideo ? itemStruct.video?.playAddr : null,
        videoUrlBackup: isVideo ? itemStruct.video?.downloadAddr : null,
        images: images,
        music: {
            id: music.id,
            title: music.title || "",
            author: music.authorName || "",
            playUrl: music.playUrl || null
        },
        stats: {
            playCount: stats.playCount || 0,
            diggCount: stats.diggCount || 0,
            commentCount: stats.commentCount || 0,
            shareCount: stats.shareCount || 0,
            downloadCount: stats.downloadCount || 0
        },
        author: {
            id: author.id,
            uniqueId: author.uniqueId || "",
            nickname: author.nickname || "",
            avatar: author.avatarLarger || author.avatarMedium || author.avatarThumb || null
        },
        createTime: itemStruct.createTime ? parseInt(itemStruct.createTime) : null,
        hashtags: (itemStruct.challenges || []).map(ch => ({
            id: ch.id,
            name: ch.title || "",
            description: ch.desc || ""
        })),
        isAd: itemStruct.isAd || false,
        isAigc: itemStruct.IsAigc || false
    }
}

export default {
    route: {
        method: "get",
        path: "/downloader/tiktok-direct",
        auth: false,
        tags: ["Downloader"],
        summary: "Download TikTok video langsung",
        description:
            "Download video atau slideshow TikTok secara langsung dari HTML page. " +
            "Mengembalikan URL video tanpa watermark, URL backup dengan watermark, dan metadata lengkap. " +
            "Mendukung video dan slideshow (photo post).\n\n" +
            "**Contoh:**\n" +
            "```\nGET /downloader/tiktok-direct?url=https://www.tiktok.com/@user/video/123456\nGET /downloader/tiktok-direct?url=https://vt.tiktok.com/ZSxPtqPN8\n```",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL video atau photo TikTok",
                schema: { type: "string" }
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
                                result: { type: "object" }
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
                description: "Kesalahan server",
                content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } }
            }
        }
    },

    handler: async (req, res) => {
        const { url } = req.query
        if (!url) return res.status(400).json({ ok: false, error: "url wajib diisi" })
        try {
            const result = await tiktokDirect(url)
            res.json({ ok: true, result })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

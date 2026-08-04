// /maker/jj-capcut-generator — JJ CapCut Template Generator
// Generates CapCut-style template data (template_id, share URL, stats, author, music, etc.)
// This is a GENERATOR — it builds new template data from user input, NOT a scraper/downloader.
import crypto from "crypto"

// ── Style presets ────────────────────────────────────────────────────
const STYLES = {
    jj: {
        label: "JJ Signature",
        ratio: "9:16",
        dimensions: { width: 1080, height: 1920 },
        duration_range: [8000, 25000],
        music_genre: ["Pop", "Phonk", "EDM", "Hip-hop", "Viral Remix"],
        tag_pool: ["jj", "viral", "trending", "fyp", "capcut"],
        language: "id",
        region: "ID",
        views_range: [1200000, 28000000],
        uses_range: [45000, 1200000],
        likes_range: [89000, 3500000],
        accent_color: "#FF2D55",
    },
    viral: {
        label: "Viral FYP",
        ratio: "9:16",
        dimensions: { width: 1080, height: 1920 },
        duration_range: [5000, 18000],
        music_genre: ["Trending", "Remix", "Dance", "Viral Beat"],
        tag_pool: ["viral", "fyp", "trending", "fypシ", "template"],
        language: "id",
        region: "ID",
        views_range: [500000, 15000000],
        uses_range: [20000, 800000],
        likes_range: [30000, 2000000],
        accent_color: "#00F5D4",
    },
    aesthetic: {
        label: "Aesthetic Soft",
        ratio: "16:9",
        dimensions: { width: 1920, height: 1080 },
        duration_range: [15000, 45000],
        music_genre: ["Lo-fi", "Indie", "Acoustic", "Ambient"],
        tag_pool: ["aesthetic", "soft", "calm", "vibes", "moody"],
        language: "en",
        region: "US",
        views_range: [80000, 2500000],
        uses_range: [5000, 150000],
        likes_range: [10000, 500000],
        accent_color: "#F4A6C7",
    },
    gaming: {
        label: "Gaming Highlights",
        ratio: "16:9",
        dimensions: { width: 1920, height: 1080 },
        duration_range: [10000, 30000],
        music_genre: ["Phonk", "Hardstyle", "EDM", "Trap"],
        tag_pool: ["gaming", "fragmovie", "highlight", "montage", "phongk"],
        language: "en",
        region: "US",
        views_range: [200000, 8000000],
        uses_range: [10000, 400000],
        likes_range: [15000, 1200000],
        accent_color: "#9D00FF",
    },
    cinematic: {
        label: "Cinematic 21:9",
        ratio: "21:9",
        dimensions: { width: 2560, height: 1080 },
        duration_range: [20000, 60000],
        music_genre: ["Orchestral", "Epic", "Score", "Hybrid"],
        tag_pool: ["cinematic", "epic", "movie", "filmic", "trailer"],
        language: "en",
        region: "US",
        views_range: [150000, 5000000],
        uses_range: [8000, 250000],
        likes_range: [20000, 800000],
        accent_color: "#FFB800",
    },
    trending: {
        label: "Hot Right Now",
        ratio: "9:16",
        dimensions: { width: 1080, height: 1920 },
        duration_range: [7000, 22000],
        music_genre: ["Trending", "Top 40", "Remix", "Viral"],
        tag_pool: ["trending", "hot", "viral", "fyp", "popular"],
        language: "id",
        region: "ID",
        views_range: [800000, 22000000],
        uses_range: [30000, 900000],
        likes_range: [50000, 2800000],
        accent_color: "#FF4500",
    },
}

// ── Helpers ──────────────────────────────────────────────────────────
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = arr => arr[Math.floor(Math.random() * arr.length)]

function genTemplateId() {
    // CapCut template IDs are 19-digit numeric strings
    let id = ""
    const firstDigit = randInt(7, 9) // first digit 7-9
    id += firstDigit
    for (let i = 1; i < 19; i++) id += randInt(0, 9)
    return id
}

function genAuthorId() {
    // CapCut user IDs ~ 19-20 digits
    let id = String(randInt(7, 9))
    for (let i = 1; i < 19; i++) id += randInt(0, 9)
    return id
}

function genAvatar() {
    // DiceBear-style avatar URL
    const seed = Math.random().toString(36).slice(2, 12)
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&radius=50`
}

function genCoverUrl(templateId) {
    // Picsum placeholder (real image CDN)
    const w = 1080
    const h = 1920
    return `https://picsum.photos/seed/${templateId}/${w}/${h}`
}

function genVideoUrl(templateId) {
    // A sample mp4 from a public CDN
    return `https://cdn.coverr.co/videos/coverr-capcut-${templateId}-1080p.mp4`
}

function genMusicUrl() {
    return `https://www.capcut.com/music/${genTemplateId()}`
}

function genDescription(title, style) {
    const templates = {
        jj: [
            `Template JJ terbaru! Pakai untuk video kamu dan tagar #jj #capcut`,
            `Edit ala JJ — simple tapi viral. Klik "Use Template" sekarang!`,
            `JJ signature style. Cocok untuk konten harian kamu.`,
        ],
        viral: [
            `Viral FYP guarantee! Pakai template ini sebelum trenya selesai.`,
            `Template yang lagi naik daun. Sekali pakai langsung FYP.`,
            `Jangan ketinggalan! Pakai template viral ini sekarang.`,
        ],
        aesthetic: [
            `Soft aesthetic vibes for your calm content.`,
            `Cinematic tones, gentle cuts, perfect for moody reels.`,
            `Aesthetic template with smooth transitions and lo-fi feel.`,
        ],
        gaming: [
            `For your frag movie / highlight reel. Hard cuts, phonk beat.`,
            `Gaming montage template — sync with the beat drop.`,
            `Built for clutch plays. Phonk + cinematic slow-mo.`,
        ],
        cinematic: [
            `Cinematic 21:9 — for your epic short film / trailer.`,
            `Orchestral score, anamorphic flares, filmic grade.`,
            `Bring the cinema to your phone. Edit like a pro.`,
        ],
        trending: [
            `Lagi trending banget! Pakai sebelum hilang dari FYP.`,
            `Hot template of the day. Jangan skip!`,
            `Trending sekarang — pakai dan share ke temen.`,
        ],
    }
    const arr = templates[style] || templates.jj
    return `${title}. ${pick(arr)}`
}

function genStats(preset) {
    const [vMin, vMax] = preset.views_range
    const [uMin, uMax] = preset.uses_range
    const [lMin, lMax] = preset.likes_range
    const views = randInt(vMin, vMax)
    const uses = randInt(uMin, uMax)
    const likes = randInt(lMin, lMax)
    // Comments: typically 1-3% of likes
    const comments = Math.floor(likes * (Math.random() * 0.03 + 0.005))
    // Segments: depends on duration
    return {
        views,
        uses,
        likes,
        comments,
        segments: randInt(3, 12),
        shares: Math.floor(uses * (Math.random() * 0.15 + 0.05)),
    }
}

function genAuthor(authorName, region) {
    const name = authorName || pick([
        "jj.creator", "viral.editor", "aesthetic.studio",
        "gaming.montage", "cinematic.vibes", "trending.capcut",
        "jj.studio", "fyp.templates", "capcut.pro", "edit.lab",
    ])
    return {
        uid: genAuthorId(),
        name,
        nickname: name,
        avatar: genAvatar(),
        region: region || "ID",
        verified: Math.random() > 0.6,
        followers: randInt(5000, 8500000),
        templates_count: randInt(12, 540),
    }
}

function genMusic(style) {
    const titles = {
        jj: ["JJ Theme", "Sigma Beat", "Phonk Drop", "Viral Mix"],
        viral: ["Trending Now", "FYP Beat", "Viral Remix", "Dance Mix"],
        aesthetic: ["Lo-fi Dreams", "Soft Hours", "Calm Waves", "Indie Soul"],
        gaming: ["Phonk Mode", "Hardstyle Drop", "Trap Battle", "Frag Beat"],
        cinematic: ["Epic Trailer", "Orchestral Rise", "Cinematic Score", "Epic Hybrid"],
        trending: ["Hot Today", "Top 40 Cut", "Trending Hook", "Viral Hook"],
    }
    const arr = titles[style] || titles.jj
    return {
        title: pick(arr),
        author: pick(["CapCut Music", "Viral Beats", "DJ Unknown", "Trending Audio"]),
        duration_ms: randInt(15000, 60000),
        url: genMusicUrl(),
        genre: pick(["Pop", "Phonk", "EDM", "Lo-fi", "Trap", "Orchestral"]),
    }
}

function genCreatedAt() {
    // Random time within last 90 days
    const now = Date.now()
    const offset = randInt(0, 90 * 24 * 60 * 60 * 1000)
    return new Date(now - offset).toISOString()
}

function genShareUrl(templateId) {
    return `https://www.capcut.com/t/${templateId}/`
}

function genDeepLink(templateId) {
    return `capcut://template/detail?template_id=${templateId}`
}

function genQrUrl(shareUrl) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`
}

function genSignature(templateId, title) {
    return crypto
        .createHash("sha256")
        .update(`${templateId}|${title}|${Date.now()}`)
        .digest("hex")
        .slice(0, 32)
}

// ── Main generator ───────────────────────────────────────────────────
function generateTemplate({
    title,
    author,
    video_url,
    cover_url,
    duration_ms,
    style = "jj",
    region,
    language,
    views,
    uses,
    likes,
    tag,
    description,
} = {}) {
    const preset = STYLES[style] || STYLES.jj

    const templateId = genTemplateId()
    const finalTitle = (title || pick([
        "My JJ Template",
        "Viral CapCut Edit",
        "Aesthetic Story",
        "Gaming Highlight Reel",
        "Cinematic Teaser",
        "Trending FYP Edit",
        "Daily Vibe Edit",
        "Sigma Energy",
        "Soft Moments",
        "Phonk Battle",
    ])).slice(0, 120)

    const finalAuthor = genAuthor(author, region || preset.region)
    const stats = genStats(preset)

    // Override stats if user provided values
    if (typeof views === "number" && views >= 0) stats.views = views
    if (typeof uses === "number" && uses >= 0) stats.uses = uses
    if (typeof likes === "number" && likes >= 0) stats.likes = likes

    const finalDuration = (typeof duration_ms === "number" && duration_ms > 0)
        ? duration_ms
        : randInt(preset.duration_range[0], preset.duration_range[1])

    const finalVideoUrl = video_url || genVideoUrl(templateId)
    const finalCoverUrl = cover_url || genCoverUrl(templateId)
    const shareUrl = genShareUrl(templateId)
    const finalTag = tag || pick(preset.tag_pool)
    const finalDesc = description || genDescription(finalTitle, style)
    const finalLanguage = language || preset.language

    return {
        template_id: templateId,
        title: finalTitle,
        description: finalDesc,
        style: {
            id: style,
            label: preset.label,
            accent_color: preset.accent_color,
        },
        url: shareUrl,
        deep_link: genDeepLink(templateId),
        qr_url: genQrUrl(shareUrl),
        author: finalAuthor,
        video_url: finalVideoUrl,
        cover_url: finalCoverUrl,
        duration_ms: finalDuration,
        dimensions: preset.dimensions,
        ratio: preset.ratio,
        music: genMusic(style),
        stats,
        language: finalLanguage,
        region: region || preset.region,
        tag: finalTag,
        created_at: genCreatedAt(),
        signature: genSignature(templateId, finalTitle),
        source: "jj-capcut-generator",
        generated_at: new Date().toISOString(),
        disclaimer: "Generated template data — NOT a real CapCut template. For demo/testing/preview purposes only.",
    }
}

export default {
    route: {
        method: "get",
        path: "/maker/jj-capcut-generator",
        auth: false,
        tags: ["Maker"],
        summary: "JJ CapCut Template Generator — generate CapCut-style template data",
        description: "Generator template CapCut (BUKAN downloader). Membuat data template gaya CapCut (template_id, share URL, QR code, author, music, statistik, dll) dari input user atau acak sesuai style preset. Berguna untuk demo, mock UI, testing, atau pranks. Endpoints tersedia: jj / viral / aesthetic / gaming / cinematic / trending.",
        parameters: [
            { name: "title", in: "query", description: "Judul template (cth: 'My Sigma Edit')", schema: { type: "string", example: "Viral Sigma Edit" } },
            { name: "author", in: "query", description: "Nama author", schema: { type: "string", example: "jj.creator" } },
            { name: "video_url", in: "query", description: "URL video untuk embed (optional)", schema: { type: "string", format: "uri" } },
            { name: "cover_url", in: "query", description: "URL cover image (optional)", schema: { type: "string", format: "uri" } },
            { name: "duration_ms", in: "query", description: "Durasi dalam milidetik", schema: { type: "integer", minimum: 1000 } },
            { name: "style", in: "query", description: "Preset style", schema: { type: "string", enum: Object.keys(STYLES), default: "jj" } },
            { name: "region", in: "query", description: "Kode region (cth: ID, US, JP)", schema: { type: "string" } },
            { name: "language", in: "query", description: "Kode bahasa (cth: id, en)", schema: { type: "string" } },
            { name: "views", in: "query", description: "Override views count", schema: { type: "integer", minimum: 0 } },
            { name: "uses", in: "query", description: "Override uses count", schema: { type: "integer", minimum: 0 } },
            { name: "likes", in: "query", description: "Override likes count", schema: { type: "integer", minimum: 0 } },
            { name: "tag", in: "query", description: "Custom tag", schema: { type: "string" } },
            { name: "description", in: "query", description: "Custom description", schema: { type: "string" } },
        ],
        responses: {
            "200": {
                description: "Template data berhasil dibuat",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean", example: true },
                                result: {
                                    type: "object",
                                    properties: {
                                        template_id: { type: "string", example: "7234567890123456789" },
                                        title: { type: "string" },
                                        description: { type: "string" },
                                        url: { type: "string", format: "uri" },
                                        deep_link: { type: "string" },
                                        qr_url: { type: "string", format: "uri" },
                                        author: { type: "object" },
                                        video_url: { type: "string", format: "uri" },
                                        cover_url: { type: "string", format: "uri" },
                                        duration_ms: { type: "integer" },
                                        dimensions: { type: "object" },
                                        ratio: { type: "string" },
                                        music: { type: "object" },
                                        stats: { type: "object" },
                                        signature: { type: "string" },
                                        source: { type: "string" },
                                        disclaimer: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            "400": { description: "Parameter tidak valid" },
        },
    },

    handler: async (req, res) => {
        const q = req.query || {}
        const {
            title,
            author,
            video_url,
            cover_url,
            duration_ms,
            style,
            region,
            language,
            views,
            uses,
            likes,
            tag,
            description,
        } = q

        // Validate style
        const styleKey = (style || "jj").toLowerCase().trim()
        if (!STYLES[styleKey]) {
            return res.status(400).json({
                ok: false,
                error: `Style tidak valid. Pilihan: ${Object.keys(STYLES).join(", ")}`,
                received: style,
            })
        }

        // Parse numbers (handle string inputs from query)
        const parsedDuration = duration_ms ? parseInt(duration_ms, 10) : undefined
        const parsedViews = views !== undefined ? parseInt(views, 10) : undefined
        const parsedUses = uses !== undefined ? parseInt(uses, 10) : undefined
        const parsedLikes = likes !== undefined ? parseInt(likes, 10) : undefined

        if (parsedDuration !== undefined && (isNaN(parsedDuration) || parsedDuration < 1000)) {
            return res.status(400).json({ ok: false, error: "duration_ms harus integer >= 1000" })
        }
        if (parsedViews !== undefined && (isNaN(parsedViews) || parsedViews < 0)) {
            return res.status(400).json({ ok: false, error: "views harus integer >= 0" })
        }
        if (parsedUses !== undefined && (isNaN(parsedUses) || parsedUses < 0)) {
            return res.status(400).json({ ok: false, error: "uses harus integer >= 0" })
        }
        if (parsedLikes !== undefined && (isNaN(parsedLikes) || parsedLikes < 0)) {
            return res.status(400).json({ ok: false, error: "likes harus integer >= 0" })
        }

        try {
            const result = generateTemplate({
                title,
                author,
                video_url,
                cover_url,
                duration_ms: parsedDuration,
                style: styleKey,
                region,
                language,
                views: parsedViews,
                uses: parsedUses,
                likes: parsedLikes,
                tag,
                description,
            })
            res.json({ ok: true, result })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

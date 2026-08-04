// /maker/jj-capcut-generator — JJ CapCut Generator (WhatsApp-bot style)
// Generates a "JJ Capcut - Detail" card matching the WhatsApp bot format.
// Modes: detail (single card) | list (20 templates) | select (confirmation) | render (final video)
import crypto from "crypto"

// ── Format helpers ───────────────────────────────────────────────────
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = arr => arr[Math.floor(Math.random() * arr.length)]

// Format large numbers like 1700000 → "1.7M", 388900 → "388.9K", 559 → "559"
function formatCount(n) {
    if (n >= 1_000_000) {
        const v = n / 1_000_000
        return (v >= 10 ? Math.floor(v) : Math.floor(v * 10) / 10) + "M"
    }
    if (n >= 1_000) {
        const v = n / 1_000
        return (v >= 100 ? Math.floor(v) : Math.floor(v * 10) / 10) + "K"
    }
    return String(n)
}

function genTemplateId() {
    let id = String(randInt(7, 9))
    for (let i = 1; i < 19; i++) id += randInt(0, 9)
    return id
}

// ── Style presets ────────────────────────────────────────────────────
const STYLES = {
    jj: {
        label: "JJ Signature",
        ratio: "1:1",
        resolution: "1080x1080",
        duration_range: [8, 25],
        fragment_range: [3, 12],
        photo_range: [0, 5],
        video_range: [0, 3],
        views_range: [800_000, 12_000_000],
        usage_range: [120_000, 2_500_000],
        likes_range: [50_000, 600_000],
        favorite_range: [20_000, 200_000],
        comments_range: [200, 8_000],
        shares_range: [1_000, 30_000],
        accent: "🟣",
    },
    viral: {
        label: "Viral FYP",
        ratio: "9:16",
        resolution: "1080x1920",
        duration_range: [5, 18],
        fragment_range: [3, 10],
        photo_range: [0, 8],
        video_range: [0, 4],
        views_range: [2_000_000, 22_000_000],
        usage_range: [400_000, 3_500_000],
        likes_range: [100_000, 1_500_000],
        favorite_range: [40_000, 400_000],
        comments_range: [500, 15_000],
        shares_range: [3_000, 60_000],
        accent: "🔥",
    },
    dj: {
        label: "DJ Kane",
        ratio: "1:1",
        resolution: "1080x1080",
        duration_range: [10, 30],
        fragment_range: [4, 15],
        photo_range: [0, 6],
        video_range: [0, 2],
        views_range: [500_000, 8_000_000],
        usage_range: [80_000, 1_800_000],
        likes_range: [40_000, 500_000],
        favorite_range: [15_000, 150_000],
        comments_range: [150, 5_000],
        shares_range: [800, 20_000],
        accent: "🎧",
    },
    aesthetic: {
        label: "Aesthetic Soft",
        ratio: "16:9",
        resolution: "1920x1080",
        duration_range: [15, 45],
        fragment_range: [5, 18],
        photo_range: [0, 12],
        video_range: [0, 5],
        views_range: [80_000, 2_500_000],
        usage_range: [5_000, 150_000],
        likes_range: [10_000, 500_000],
        favorite_range: [5_000, 100_000],
        comments_range: [50, 2_000],
        shares_range: [200, 8_000],
        accent: "🌸",
    },
    cinematic: {
        label: "Cinematic",
        ratio: "21:9",
        resolution: "2560x1080",
        duration_range: [20, 60],
        fragment_range: [6, 20],
        photo_range: [0, 4],
        video_range: [0, 8],
        views_range: [150_000, 5_000_000],
        usage_range: [8_000, 250_000],
        likes_range: [20_000, 800_000],
        favorite_range: [8_000, 200_000],
        comments_range: [100, 3_000],
        shares_range: [400, 12_000],
        accent: "🎬",
    },
    trending: {
        label: "Trending",
        ratio: "9:16",
        resolution: "1080x1920",
        duration_range: [7, 22],
        fragment_range: [3, 11],
        photo_range: [0, 7],
        video_range: [0, 3],
        views_range: [1_000_000, 18_000_000],
        usage_range: [200_000, 2_800_000],
        likes_range: [70_000, 1_200_000],
        favorite_range: [30_000, 350_000],
        comments_range: [300, 10_000],
        shares_range: [1_500, 45_000],
        accent: "⚡",
    },
}

// ── Title / hashtag pools ────────────────────────────────────────────
const TITLE_POOL = [
    "#trendcapcut 🔥 #trend",
    "#jjcapcut #viral",
    "#capcutedit #trending",
    "#dj #kane #phonk",
    "#fypシ #trend",
    "#viralcapcut #jj",
    "#aestheticedit #capcut",
    "#capcuttemplate #trend",
    "#trend2026 #fyp",
    "#jjcapcut2026 🔥",
    "#djseram #trend",
    "#djkane #viral",
    "#phonk #capcut #edit",
    "#capcutpro #trending",
    "#jjedit #viral",
]

const SHORT_POOL = [
    "nih versi 1:1",
    "versi 9:16 cuy",
    "auto viral terus ini",
    "soundnya kane bgt",
    "soundnya serem gann",
    "jj kece cuy",
    "loop mirip am wak",
    "dj ada pokemon slow",
    "dj habibi v2",
    "dj tot tot 🔥",
    "dj kane night",
    "old kane simple",
    "jj capcut kece",
    "dj seram #2",
    "soundnya ngena parah",
]

const AUTHOR_POOL = [
    "Leviiee", "SeptiaOfc", "FgsiJC", "MilaAIT", "AngelinaEmpire",
    "JJCreator", "ViralEdit", "KanePhonk", "CapcutPro", "EditLab",
    "SigmaEdit", "AestheticVibes", "CinematicStudio", "PhonkMaster",
    "TrendingEdit", "JJStudio", "FYPKing", "EditGuru", "CapcutID",
    "JJMaker", "DjKaneID", "ViralTemplate", "EditSultan", "CapcutViral",
]

const USERNAME_POOL = [
    "@77_N4", "@leviiee_", "@septia_ofc", "@fgsi_jc", "@mila.ait",
    "@jj.creator", "@viral.edit", "@kane_phonk", "@capcut.pro", "@edit.lab",
    "@sigma.edit", "@aesthetic.vibes", "@cinematic.studio", "@phonk.master",
    "@trending.edit", "@jj.studio", "@fyp.king", "@edit.guru", "@capcut.id",
    "@jj.maker", "@dj.kane", "@viral.template", "@edit.sultan", "@capcut.viral",
]

// Pre-defined template names (from screenshots, used for list mode)
const TEMPLATE_NAMES = [
    "Testing",
    "DJ ADA POKEMON SLOW",
    "DJ HABIBI V2",
    "Kurang tahu namanya",
    "OLD KANE SIMPLE",
    "DJ KANE NIGHT",
    "DJ TOT TOT",
    "DJ SEREM",
    "🧍",
    "Dj Seram #2 🧍",
    "SOUNDNYA KANE BGT",
    "SOUNDNYA SEREM",
    "JJ Kane",
    "JJ Kece",
    "JJ Kece Cuy",
    "JJ Kece Cuy Lagi",
    "JJ Capcut Kece",
    "jj mirip am wak",
    "loop mirip am",
    ".JJ CAPCUT KFCE",
]

// ── Card builder ─────────────────────────────────────────────────────
function genAuthorName() { return pick(AUTHOR_POOL) }
function genUsername() { return pick(USERNAME_POOL) }
function genTitle() { return pick(TITLE_POOL) }
function genShort() { return pick(SHORT_POOL) }

function buildDetailCard({
    title,
    short,
    author,
    username,
    template_id,
    duration_s,
    fragment,
    photo,
    video,
    resolution,
    ratio,
    usage,
    play,
    likes,
    favorites,
    comments,
    shares,
} = {}) {
    const id = template_id || genTemplateId()
    return {
        judul: title || genTitle(),
        short: short || genShort(),
        author: author || genAuthorName(),
        username: username || genUsername(),
        id,
        durasi: duration_s ? `${duration_s}s` : `${randInt(8, 25)}s`,
        fragment: fragment ?? randInt(3, 12),
        photo: photo ?? randInt(0, 5),
        video: video ?? randInt(0, 3),
        resolusi: resolution || "1080x1080",
        ratio: ratio || "1:1",
        stats: {
            usage: usage || formatCount(randInt(120_000, 2_500_000)),
            play: play || formatCount(randInt(800_000, 12_000_000)),
            like: likes || formatCount(randInt(50_000, 600_000)),
            favorite: favorites || formatCount(randInt(20_000, 200_000)),
            comment: comments ?? randInt(200, 8_000),
            share: shares || formatCount(randInt(1_000, 30_000)),
        },
    }
}

// Build the formatted text card (like WhatsApp bot output)
function formatCardText(card, style = "jj") {
    const accent = STYLES[style]?.accent || "🟣"
    const sep = "───────────────────"
    return [
        `${accent} *JJ Capcut - Detail*`,
        sep,
        `📌 Judul     : ${card.judul}`,
        `🏷️ Short     : ${card.short}`,
        `👤 Author    : ${card.author}`,
        `🆔 Username  : ${card.username}`,
        `📁 ID        : ${card.id}`,
        sep,
        `⏱️ Durasi    : ${card.durasi}`,
        `🖼️ Fragment  : ${card.fragment}`,
        `📸 Photo     : ${card.photo}`,
        `🎥 Video     : ${card.video}`,
        `📐 Resolusi  : ${card.resolusi}`,
        sep,
        `📊 Stats:`,
        `🔥 Usage     : ${card.stats.usage}`,
        `▶️ Play      : ${card.stats.play}`,
        `❤️ Like      : ${card.stats.like}`,
        `⭐ Favorite  : ${card.stats.favorite}`,
        `💬 Comment   : ${card.stats.comment}`,
        `🔄 Share     : ${card.stats.share}`,
        sep,
    ].join("\n")
}

// Build the list of 20 templates (like the .jjcc command output)
function buildTemplateList() {
    const list = []
    for (let i = 0; i < 20; i++) {
        const name = TEMPLATE_NAMES[i] || `Template ${i + 1}`
        const foto = randInt(2, 5)
        const ratio = pick(["1:1", "9:16", "16:9"])
        list.push({
            no: i + 1,
            name,
            foto,
            ratio,
        })
    }
    return list
}

function formatListText(list) {
    const header = "*List Template JJCapCut:*\n"
    const body = list.map(t => `${t.no}. ${t.name} (Foto: ${t.foto}) [${t.ratio}]`).join("\n")
    const footer = "\n\n_Ketik .jjcc <nomor> untuk pilih template_"
    return header + body + footer
}

// Build the "select template" confirmation
function buildSelectResponse(templateName, fotoCount = 3) {
    return {
        header: `✅ Template [${templateName}]`,
        status: "Dipilih!",
        target: `${fotoCount} Foto`,
        instructions_title: "Cara ngirimnya:",
        instructions: [
            `Kirim foto dengan caption .jjcc`,
            `Atau reply foto satu per satu yang ada di chat dengan teks .jjcc`,
        ],
        target_count: fotoCount,
    }
}

function formatSelectText(sel) {
    return [
        `${sel.header}`,
        `${sel.status}`,
        `Target: ${sel.target}`,
        ``,
        `${sel.instructions_title}`,
        ...sel.instructions,
    ].join("\n")
}

// Build the "render done" response
function buildRenderResponse(templateName, style = "jj") {
    const fileSizeMb = randInt(15, 65)
    const downloadId = crypto.randomBytes(8).toString("hex")
    return {
        template_name: templateName,
        status: "Done njir! 🗿🔥",
        file_size: `${fileSizeMb} MB`,
        download_url: `https://cdn.jjcapcut.com/render/${downloadId}.mp4`,
        thumbnail_url: `https://picsum.photos/seed/${downloadId}/500/500`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        quality: pick(["480p", "720p", "1080p"]),
        format: "mp4",
    }
}

function formatRenderText(r) {
    return [
        `✅ *${r.template_name}*`,
        `${r.status}`,
        ``,
        `📦 Size: ${r.file_size}`,
        `🎬 Quality: ${r.quality}`,
        `⏳ Expires: 24 jam`,
        ``,
        `Download: ${r.download_url}`,
    ].join("\n")
}

// ── Main handler ─────────────────────────────────────────────────────
export default {
    route: {
        method: "get",
        path: "/maker/jj-capcut-generator",
        auth: false,
        tags: ["Maker"],
        summary: "JJ CapCut Generator — kartu detail ala bot WhatsApp JJ",
        description: `Generator kartu "JJ Capcut - Detail" ala bot WhatsApp. Menghasilkan card dengan field Judul, Short, Author, Username, ID, Durasi, Fragment, Photo, Video, Resolusi, dan Stats (Usage, Play, Like, Favorite, Comment, Share).

Mode:
- *detail* (default): Generate 1 kartu detail lengkap
- *list*: Generate list 20 template (ala command .jjcc)
- *select*: Generate konfirmasi pilihan template + instruksi
- *render*: Generate hasil render video (download URL + size)`,
        parameters: [
            { name: "mode", in: "query", description: "Mode output", schema: { type: "string", enum: ["detail", "list", "select", "render"], default: "detail" } },
            { name: "style", in: "query", description: "Preset style", schema: { type: "string", enum: Object.keys(STYLES), default: "jj" } },
            { name: "title", in: "query", description: "Judul manual (cth: #trendcapcut 🔥)", schema: { type: "string" } },
            { name: "short", in: "query", description: "Deskripsi singkat", schema: { type: "string" } },
            { name: "author", in: "query", description: "Nama author", schema: { type: "string" } },
            { name: "username", in: "query", description: "Username (@handle)", schema: { type: "string" } },
            { name: "template_id", in: "query", description: "19-digit template ID", schema: { type: "string" } },
            { name: "duration_s", in: "query", description: "Durasi detik", schema: { type: "integer", minimum: 1 } },
            { name: "fragment", in: "query", description: "Jumlah fragment", schema: { type: "integer", minimum: 0 } },
            { name: "photo", in: "query", description: "Jumlah photo", schema: { type: "integer", minimum: 0 } },
            { name: "video", in: "query", description: "Jumlah video", schema: { type: "integer", minimum: 0 } },
            { name: "resolution", in: "query", description: "Resolusi (cth: 1080x1080)", schema: { type: "string" } },
            { name: "ratio", in: "query", description: "Rasio (cth: 1:1, 9:16)", schema: { type: "string" } },
            { name: "template_name", in: "query", description: "Nama template (untuk mode select/render)", schema: { type: "string" } },
            { name: "format", in: "query", description: "Output format: json (default) atau text", schema: { type: "string", enum: ["json", "text"], default: "json" } },
        ],
        responses: {
            "200": { description: "Berhasil" },
            "400": { description: "Parameter tidak valid" },
        },
    },

    handler: async (req, res) => {
        const q = req.query || {}
        const mode = (q.mode || "detail").toLowerCase().trim()
        const styleKey = (q.style || "jj").toLowerCase().trim()
        const outputFormat = (q.format || "json").toLowerCase().trim()

        if (!STYLES[styleKey]) {
            return res.status(400).json({
                ok: false,
                error: `Style tidak valid. Pilihan: ${Object.keys(STYLES).join(", ")}`,
                received: q.style,
            })
        }

        const preset = STYLES[styleKey]

        try {
            // ── MODE: LIST ─────────────────────────────────────────────
            if (mode === "list") {
                const list = buildTemplateList()
                const text = formatListText(list)
                if (outputFormat === "text") {
                    return res.type("text/plain").send(text)
                }
                return res.json({
                    ok: true,
                    mode: "list",
                    style: styleKey,
                    count: list.length,
                    list,
                    text,
                })
            }

            // ── MODE: SELECT ───────────────────────────────────────────
            if (mode === "select") {
                const templateName = q.template_name || pick(TEMPLATE_NAMES.filter(n => !n.startsWith(".") && !n.startsWith("🧍")))
                const fotoCount = parseInt(q.photo, 10) || randInt(2, 5)
                const sel = buildSelectResponse(templateName, fotoCount)
                const text = formatSelectText(sel)
                if (outputFormat === "text") {
                    return res.type("text/plain").send(text)
                }
                return res.json({
                    ok: true,
                    mode: "select",
                    style: styleKey,
                    result: sel,
                    text,
                })
            }

            // ── MODE: RENDER ───────────────────────────────────────────
            if (mode === "render") {
                const templateName = q.template_name || pick(TEMPLATE_NAMES.filter(n => !n.startsWith(".") && !n.startsWith("🧍")))
                const r = buildRenderResponse(templateName, styleKey)
                const text = formatRenderText(r)
                if (outputFormat === "text") {
                    return res.type("text/plain").send(text)
                }
                return res.json({
                    ok: true,
                    mode: "render",
                    style: styleKey,
                    result: r,
                    text,
                })
            }

            // ── MODE: DETAIL (default) ────────────────────────────────
            if (mode !== "detail") {
                return res.status(400).json({
                    ok: false,
                    error: `Mode tidak valid. Pilihan: detail, list, select, render`,
                    received: mode,
                })
            }

            // Apply style preset defaults
            const duration_s = q.duration_s ? parseInt(q.duration_s, 10) : randInt(preset.duration_range[0], preset.duration_range[1])
            const fragment = q.fragment !== undefined ? parseInt(q.fragment, 10) : randInt(preset.fragment_range[0], preset.fragment_range[1])
            const photo = q.photo !== undefined ? parseInt(q.photo, 10) : randInt(preset.photo_range[0], preset.photo_range[1])
            const video = q.video !== undefined ? parseInt(q.video, 10) : randInt(preset.video_range[0], preset.video_range[1])

            const card = buildDetailCard({
                title: q.title,
                short: q.short,
                author: q.author,
                username: q.username,
                template_id: q.template_id,
                duration_s,
                fragment,
                photo,
                video,
                resolution: q.resolution || preset.resolution,
                ratio: q.ratio || preset.ratio,
                usage: q.usage,
                play: q.play,
                likes: q.likes,
                favorites: q.favorites,
                comments: q.comments ? parseInt(q.comments, 10) : undefined,
                shares: q.shares,
            })

            const text = formatCardText(card, styleKey)
            if (outputFormat === "text") {
                return res.type("text/plain").send(text)
            }

            return res.json({
                ok: true,
                mode: "detail",
                style: { id: styleKey, label: preset.label, accent: preset.accent },
                result: card,
                text,
                disclaimer: "Generated template data — bukan template CapCut asli. Untuk demo/testing/preview.",
            })
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

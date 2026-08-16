// /info/random-quotes — Random Quotes API by KangWifi
// 1005 quotes in 15 categories, per-user uniqueness, Fisher-Yates shuffle
// Setiap orang mendapat quote berbeda-beda!

import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Load quotes data (loaded once at startup) ──────────────────────────────
const quotesData = JSON.parse(
    readFileSync(join(__dirname, "..", "..", "assets", "quotes", "all-quotes.json"), "utf-8")
)

const VALID_CATEGORIES = [
    "motivasi", "cinta", "kehidupan", "filsafat",
    "humor", "sukses", "pendidikan", "sahabat",
    "sains", "spiritual", "presiden", "kepemimpinan",
    "kreativitas", "keberanian", "ketekunan",
]

const CATEGORY_ICONS = {
    motivasi: "🔥", cinta: "❤️", kehidupan: "🌟", filsafat: "🤔",
    humor: "😂", sukses: "🏆", pendidikan: "📚", sahabat: "🤝",
    sains: "🔬", spiritual: "🙏", presiden: "🇮🇩", kepemimpinan: "👑",
    kreativitas: "🎨", keberanian: "⚔️", ketekunan: "💪",
}

const CATEGORY_DESCRIPTIONS = {
    motivasi: "Kutipan motivasi untuk menyemangati harimu",
    cinta: "Kutipan tentang cinta dan kasih sayang",
    kehidupan: "Kutipan tentang kehidupan dan makna hidup",
    filsafat: "Kutipan filsafat dari para pemikir",
    humor: "Kutipan lucu dan menghibur",
    sukses: "Kutipan tentang kesuksesan dan pencapaian",
    pendidikan: "Kutipan tentang pendidikan dan belajar",
    sahabat: "Kutipan tentang persahabatan",
    sains: "Kutipan dari ilmuwan dan dunia sains",
    spiritual: "Kutipan spiritual dan kebijaksanaan",
    presiden: "Kutipan dari presiden & tokoh bangsa Indonesia",
    kepemimpinan: "Kutipan tentang kepemimpinan dan memimpin",
    kreativitas: "Kutipan tentang kreativitas dan inovasi",
    keberanian: "Kutipan tentang keberanian dan keteguhan hati",
    ketekunan: "Kutipan tentang ketekunan dan konsistensi",
}

// ─── In-memory per-user seen tracking ────────────────────────────────────────
// Map<userId, Set<quoteId>> — tracks which quotes each user has seen
const userSeenMap = new Map()

// ─── Fisher-Yates shuffle ────────────────────────────────────────────────────
function shuffle(arr) {
    const result = [...arr]
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
}

// ─── Generate userId from IP + User-Agent ────────────────────────────────────
function generateUserId(req) {
    const ip = req.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim()
        || req.headers?.get?.("x-real-ip")
        || req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim()
        || req.headers?.["x-real-ip"]
        || "unknown"
    const ua = req.headers?.get?.("user-agent") || req.headers?.["user-agent"] || "unknown"
    const str = `${ip}:${ua}`
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i)
        hash |= 0
    }
    return `user_${Math.abs(hash).toString(36)}`
}

// ─── Periodic cleanup of stale user data (keep memory bounded) ───────────────
// Remove users who haven't been active in 24 hours
const CLEANUP_INTERVAL = 60 * 60 * 1000 // 1 hour
const MAX_USERS = 50000

setInterval(() => {
    if (userSeenMap.size > MAX_USERS) {
        // Remove oldest 25% of users
        const keys = [...userSeenMap.keys()]
        const toRemove = Math.floor(keys.length * 0.25)
        for (let i = 0; i < toRemove; i++) {
            userSeenMap.delete(keys[i])
        }
        console.log(`[random-quotes] Cleaned up ${toRemove} stale users, ${userSeenMap.size} remaining`)
    }
}, CLEANUP_INTERVAL)

// ─── Main handler ────────────────────────────────────────────────────────────
export default {
    route: {
        method: "get",
        path: "/info/random-quotes",
        auth: false,
        tags: ["Info"],
        summary: "Random quotes (1333 quotes, 15 categories, per-user unique)",
        description:
            "1333 kutipan dalam 15 kategori (motivasi, cinta, kehidupan, filsafat, humor, sukses, pendidikan, sahabat, sains, spiritual, presiden, kepemimpinan, kreativitas, keberanian, ketekunan). " +
            "Setiap user mendapat quote berbeda — tidak ada repetisi sampai semua quote habis! " +
            "Params: userId (opsional, auto dari IP+UA), category (opsional), count (1-10, default 1), reset (true untuk reset seen).",
        parameters: [
            { name: "userId", in: "query", schema: { type: "string" }, description: "User ID unik. Auto-generated dari IP+UA jika tidak diisi." },
            { name: "category", in: "query", schema: { type: "string", enum: VALID_CATEGORIES }, description: "Filter kategori: motivasi, cinta, kehidupan, filsafat, humor, sukses, pendidikan, sahabat, sains, spiritual, presiden, kepemimpinan, kreativitas, keberanian, ketekunan" },
            { name: "count", in: "query", schema: { type: "integer", minimum: 1, maximum: 10 }, description: "Jumlah quote yang diinginkan (1-10, default 1)" },
            { name: "reset", in: "query", schema: { type: "string", enum: ["true"] }, description: "Reset seen quotes untuk user ini" },
        ],
        responses: {
            "200": { description: "Random quote(s)" },
            "400": { description: "Invalid category" },
        },
    },
    handler: async (req, res) => {
        try {
            const query = req.query || {}
            const userId = query.userId || generateUserId(req)
            const category = query.category || undefined
            const count = Math.min(Math.max(parseInt(query.count) || 1, 1), 10)
            const shouldReset = query.reset === "true"

            // Validate category
            if (category && !VALID_CATEGORIES.includes(category)) {
                return res.status(400).json({
                    status: false,
                    code: 400,
                    message: `Kategori "${category}" tidak valid. Pilihan: ${VALID_CATEGORIES.join(", ")}`,
                    result: null,
                    author: "KangWifi",
                    dev: "kangwifi.eu.org",
                })
            }

            // Reset seen quotes for this user if requested
            if (shouldReset) {
                userSeenMap.delete(userId)
            }

            // Get or create seen set for this user
            if (!userSeenMap.has(userId)) {
                userSeenMap.set(userId, new Set())
            }
            const seenIds = userSeenMap.get(userId)

            // Filter quotes by category if specified
            const allQuotes = category
                ? quotesData.filter(q => q.category === category)
                : quotesData

            if (allQuotes.length === 0) {
                return res.status(404).json({
                    status: false,
                    code: 404,
                    message: "Tidak ada quote tersedia untuk kategori ini",
                    result: null,
                    author: "KangWifi",
                    dev: "kangwifi.eu.org",
                })
            }

            // Filter out unseen quotes, or reset if all seen
            const unseenQuotes = allQuotes.filter(q => !seenIds.has(q.id))
            const pool = unseenQuotes.length > 0 ? unseenQuotes : allQuotes

            // If we're recycling (all seen), clear seen set for this category
            if (unseenQuotes.length === 0) {
                // Remove all seen IDs that belong to this category's quotes
                const categoryIds = new Set(allQuotes.map(q => q.id))
                for (const id of categoryIds) {
                    seenIds.delete(id)
                }
            }

            // Fisher-Yates shuffle and select
            const shuffled = shuffle(pool)
            const selected = shuffled.slice(0, count)

            // Track seen quotes
            for (const q of selected) {
                seenIds.add(q.id)
            }

            // Stats
            const totalInCategory = allQuotes.length
            const seenInCategory = allQuotes.filter(q => seenIds.has(q.id)).length

            // Format result
            const result = count === 1
                ? {
                    id: selected[0].id,
                    quote: selected[0].text,
                    author: selected[0].author,
                    category: selected[0].category,
                }
                : selected.map(q => ({
                    id: q.id,
                    quote: q.text,
                    author: q.author,
                    category: q.category,
                }))

            return res.json({
                status: true,
                code: 200,
                message: "Berhasil mendapatkan random quote!",
                result,
                author: "KangWifi",
                dev: "kangwifi.eu.org",
                meta: {
                    userId,
                    totalQuotes: totalInCategory,
                    seenByUser: seenInCategory,
                    remaining: Math.max(0, totalInCategory - seenInCategory),
                    category: category || "all",
                },
            })
        } catch (e) {
            return res.status(500).json({
                status: false,
                code: 500,
                message: "Internal server error",
                result: null,
                author: "KangWifi",
                dev: "kangwifi.eu.org",
            })
        }
    },
}

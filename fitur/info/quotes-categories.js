// /info/quotes-categories — List all quote categories with counts
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load quotes data
const quotesData = JSON.parse(
    readFileSync(join(__dirname, "..", "..", "assets", "quotes", "all-quotes.json"), "utf-8")
)

// Pre-compute category stats
const VALID_CATEGORIES = [
    "motivasi", "cinta", "kehidupan", "filsafat",
    "humor", "sukses", "pendidikan", "sahabat",
    "sains", "spiritual",
]

const CATEGORY_ICONS = {
    motivasi: "🔥", cinta: "❤️", kehidupan: "🌟", filsafat: "🤔",
    humor: "😂", sukses: "🏆", pendidikan: "📚", sahabat: "🤝",
    sains: "🔬", spiritual: "🙏",
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
}

const categoryStats = VALID_CATEGORIES.map(cat => {
    const count = quotesData.filter(q => q.category === cat).length
    return {
        category: cat,
        count,
        icon: CATEGORY_ICONS[cat],
        description: CATEGORY_DESCRIPTIONS[cat],
    }
})

export default {
    route: {
        method: "get",
        path: "/info/quotes-categories",
        auth: false,
        tags: ["Info"],
        summary: "Quote categories list",
        description:
            "Daftar semua kategori quote beserta jumlah dan deskripsi. " +
            "Gunakan category name sebagai parameter di /info/random-quotes?category=...",
        parameters: [],
        responses: {
            "200": { description: "Category list" },
        },
    },
    handler: async (req, res) => {
        try {
            return res.json({
                status: true,
                code: 200,
                message: "Daftar kategori quote",
                result: {
                    totalQuotes: quotesData.length,
                    totalCategories: VALID_CATEGORIES.length,
                    categories: categoryStats,
                },
                author: "KangWifi",
                dev: "kangwifi.eu.org",
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

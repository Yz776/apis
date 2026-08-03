// /info/meal — Meal recipes via TheMealDB
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/meal",
        auth: false,
        tags: ["Info"],
        summary: "Meal recipes (TheMealDB)",
        description: "Cari resep makanan berdasarkan nama, atau ambil resep acak. Sumber: TheMealDB (free, no key).",
        parameters: [
            { name: "name", in: "query", required: false, description: "Nama makanan (cth: arrabiata). Kosongkan untuk random.", schema: { type: "string" } },
            { name: "random", in: "query", required: false, description: "true untuk random meal", schema: { type: "boolean", default: false } },
        ],
        responses: { "200": { description: "Resep makanan" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            let url
            if (req.query.random === "true" || req.query.random === "1") {
                url = "https://www.themealdb.com/api/json/v1/1/random.php"
            } else if (req.query.name) {
                url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(req.query.name)}`
            } else {
                url = "https://www.themealdb.com/api/json/v1/1/random.php"
            }
            const { data } = await axios.get(url, { timeout: 15000 })
            if (!data.meals) return res.json({ ok: true, results: 0, message: "Makanan tidak ditemukan" })
            const formatMeal = (m) => {
                const ingredients = []
                for (let i = 1; i <= 20; i++) {
                    const ing = m[`strIngredient${i}`]
                    const measure = m[`strMeasure${i}`]
                    if (ing && ing.trim()) ingredients.push({ ingredient: ing, measure: (measure || "").trim() })
                }
                return {
                    id: m.idMeal,
                    name: m.strMeal,
                    category: m.strCategory,
                    area: m.strArea,
                    instructions: m.strInstructions,
                    image: m.strMealThumb,
                    youtube: m.strYoutube,
                    source: m.strSource,
                    ingredients,
                }
            }
            const meals = data.meals.map(formatMeal)
            res.json({
                ok: true,
                results: meals.length,
                meals,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

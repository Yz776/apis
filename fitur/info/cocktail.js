// /info/cocktail — Cocktail recipes via TheCocktailDB
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/cocktail",
        auth: false,
        tags: ["Info"],
        summary: "Cocktail recipes (TheCocktailDB)",
        description: "Cari resep cocktail berdasarkan nama, atau ambil cocktail acak. Sumber: TheCocktailDB (free, no key).",
        parameters: [
            { name: "name", in: "query", required: false, description: "Nama cocktail (cth: margarita). Kosongkan untuk random.", schema: { type: "string" } },
            { name: "random", in: "query", required: false, description: "true untuk random cocktail", schema: { type: "boolean", default: false } },
        ],
        responses: { "200": { description: "Resep cocktail" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            let url
            if (req.query.random === "true" || req.query.random === "1") {
                url = "https://www.thecocktaildb.com/api/json/v1/1/random.php"
            } else if (req.query.name) {
                url = `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(req.query.name)}`
            } else {
                url = "https://www.thecocktaildb.com/api/json/v1/1/random.php"
            }
            const { data } = await axios.get(url, { timeout: 15000 })
            if (!data.drinks) return res.json({ ok: true, results: 0, message: "Cocktail tidak ditemukan" })
            const formatDrink = (d) => {
                const ingredients = []
                for (let i = 1; i <= 15; i++) {
                    const ing = d[`strIngredient${i}`]
                    const measure = d[`strMeasure${i}`]
                    if (ing) ingredients.push({ ingredient: ing, measure: (measure || "").trim() })
                }
                return {
                    id: d.idDrink,
                    name: d.strDrink,
                    category: d.strCategory,
                    alcoholic: d.strAlcoholic,
                    glass: d.strGlass,
                    instructions: d.strInstructions,
                    image: d.strDrinkThumb,
                    ingredients,
                }
            }
            const drinks = data.drinks.map(formatDrink)
            res.json({
                ok: true,
                results: drinks.length,
                drinks,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

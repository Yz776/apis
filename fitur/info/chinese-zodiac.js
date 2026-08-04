// /info/chinese-zodiac — Chinese zodiac from year
const ANIMALS = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"]
const ELEMENTS = ["Wood", "Fire", "Earth", "Metal", "Water"]

export default {
    route: {
        method: "get",
        path: "/info/chinese-zodiac",
        auth: false,
        tags: ["Info"],
        summary: "Chinese zodiac from year",
        description: "Mencari shio (binatang) dan elemen zodiac Cina dari tahun lahir.",
        parameters: [
            { name: "year", in: "query", required: true, description: "Tahun lahir (1900-2100)", schema: { type: "integer", example: 1990 } },
        ],
        responses: { "200": { description: "Shio" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const y = parseInt(req.query.year, 10)
        if (!y || y < 1900 || y > 2100) return res.status(400).json({ ok: false, error: "year wajib diisi (1900-2100)" })
        // 2020 = Rat (index 0). 2020 is a Rat year
        const animalIdx = (y - 2020 + 1200) % 12 // ensure positive
        // Elements cycle: 2 years each. Wood (4,5), Fire (6,7), Earth (8,9), Metal (0,1), Water (2,3) — based on heavenly stem
        const stemIdx = (y - 4) % 10
        const elementIdx = Math.floor(stemIdx / 2)
        res.json({ ok: true, year: y, animal: ANIMALS[animalIdx], element: ELEMENTS[elementIdx], stem_branch: `${ANIMALS[animalIdx]} (${ELEMENTS[elementIdx]})` })
    },
}

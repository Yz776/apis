// /info/dog-facts — random dog facts (with fallback to local DB)
const LOCAL_DOG_FACTS = [
    "Dogs have about 1,700 taste buds.",
    "Dogs' sense of smell is 10,000 to 100,000 times more acute than humans'.",
    "A dog's nose print is unique, much like a human fingerprint.",
    "Dogs can understand up to 250 words and gestures.",
    "Dogs can smell disease in humans, including cancer and diabetes.",
    "The Basenji is the only breed of dog that cannot bark.",
    "A Greyhound can run up to 45 mph.",
    "Dogs have three eyelids: an upper, lower, and a third eyelid called a nictitating membrane.",
    "A dog's normal body temperature is 101-102.5°F (38.3-39.2°C).",
    "Puppies are born deaf, but they can hear within a week.",
    "Dogs dream just like humans do.",
    "A dog's whiskers help them sense changes in air currents.",
    "Dalmatian puppies are born completely white and develop spots as they grow.",
    "The Labrador Retriever has been the most popular dog breed in the US for over 30 years.",
    "Dogs can learn more than 1,000 words.",
    "A dog's hearing is four times more acute than a human's.",
    "The average dog can run about 19 mph.",
    "Dogs pant to cool themselves, as they cannot sweat through their skin.",
    "The Chihuahua is the smallest dog breed in the world.",
    "A dog's sense of smell is so powerful they can detect a teaspoon of sugar in two Olympic-sized pools of water.",
]

export default {
    route: {
        method: "get",
        path: "/info/dog-facts",
        auth: false,
        tags: ["Info"],
        summary: "Random dog facts",
        description: "Fakta anjing acak. Sumber utama dog-api.kinduff.com; fallback ke database lokal.",
        parameters: [
            { name: "count", in: "query", required: false, description: "Jumlah fakta (default 1, max 20)", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "Fakta anjing" }, "502": { description: "Upstream error" } },
    },
    handler: async (req, res) => {
        let count = parseInt(req.query.count, 10) || 1
        if (count < 1) count = 1
        if (count > 20) count = 20
        // Try external API first
        try {
            const r = await fetch("https://dog-api.kinduff.com/api/facts?number=" + count, { headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) })
            if (r.ok) {
                const data = await r.json()
                if (data.facts && data.facts.length > 0) {
                    return res.json({ ok: true, count: data.facts.length, facts: data.facts, source: "dog-api.kinduff.com" })
                }
            }
        } catch (e) { /* fall through to local */ }
        // Fallback: local DB
        const shuffled = [...LOCAL_DOG_FACTS].sort(() => Math.random() - 0.5)
        const facts = shuffled.slice(0, count)
        res.json({ ok: true, count: facts.length, facts, source: "local-database" })
    },
}

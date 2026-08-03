// /info/fact — Random fact (uses multiple sources, fallback chain)
import axios from "axios"

export default {
    route: {
        method: "get",
        path: "/info/fact",
        auth: false,
        tags: ["Info"],
        summary: "Random fact",
        description: "Fakta acak (uselessfacts.jsph.pl dengan fallback ke catfact.ninja). numbersapi.com sudah mati.",
        parameters: [
            { name: "number", in: "query", required: false, description: "(legacy, diabaikan)", schema: { type: "string" } },
            { name: "type", in: "query", required: false, description: "(legacy, diabaikan)", schema: { type: "string", enum: ["trivia", "math", "year", "date"], default: "trivia" } },
        ],
        responses: { "200": { description: "Fakta" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        const ua = { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
        // Try uselessfacts.jsph.pl first
        try {
            const { data } = await axios.get("https://uselessfacts.jsph.pl/api/v2/facts/random", { timeout: 15000, headers: ua })
            if (data?.text) {
                return res.json({ ok: true, fact: data.text, source: "uselessfacts.jsph.pl", id: data.id })
            }
        } catch (e1) {
            // Fallback to catfact.ninja
            try {
                const { data } = await axios.get("https://catfact.ninja/fact", { timeout: 15000, headers: ua })
                if (data?.fact) {
                    return res.json({ ok: true, fact: data.fact, source: "catfact.ninja", length: data.length })
                }
            } catch (e2) {
                // Final fallback to dog.ceo breed count
                try {
                    const { data } = await axios.get("https://dog.ceo/api/breeds/list/all", { timeout: 15000, headers: ua })
                    const breeds = Object.keys(data.message || {})
                    return res.json({ ok: true, fact: `There are ${breeds.length} dog breeds recognized by Dog CEO.`, source: "dog.ceo", breeds_total: breeds.length })
                } catch (e3) {
                    return res.status(500).json({ ok: false, error: `All fact sources failed: ${e1.message}; ${e2.message}; ${e3.message}` })
                }
            }
        }
        res.status(500).json({ ok: false, error: "No fact returned" })
    },
}

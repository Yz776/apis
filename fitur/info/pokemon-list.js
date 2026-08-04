// /info/pokemon-list — List Pokémon (paginated)
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/pokemon-list",
        auth: false,
        tags: ["Info"],
        summary: "List Pokémon (paginated)",
        description: "Daftar Pokémon dengan pagination. Sumber: PokeAPI.",
        parameters: [
            { name: "limit", in: "query", required: false, description: "Jumlah per halaman (default 20, max 100)", schema: { type: "integer", default: 20 } },
            { name: "offset", in: "query", required: false, description: "Offset (default 0)", schema: { type: "integer", default: 0 } },
        ],
        responses: { "200": { description: "Daftar Pokémon" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
            const offset = Math.max(0, parseInt(req.query.offset) || 0)
            const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`, { timeout: 15000 })
            res.json({
                ok: true,
                count: data.count,
                next: data.next,
                previous: data.previous,
                returned: data.results?.length || 0,
                pokemon: data.results,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

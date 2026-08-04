// /info/rickandmorty — Rick and Morty API
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/rickandmorty",
        auth: false,
        tags: ["Info"],
        summary: "Rick and Morty character search",
        description: "Cari karakter Rick and Morty berdasarkan nama. Sumber: rickandmortyapi.com (free, no key).",
        parameters: [
            { name: "name", in: "query", required: false, description: "Nama karakter (kosongkan untuk random)", schema: { type: "string", example: "rick" } },
            { name: "page", in: "query", required: false, description: "Halaman (default 1)", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "Daftar karakter" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const params = { page: parseInt(req.query.page) || 1 }
            if (req.query.name) params.name = req.query.name
            const { data } = await axios.get("https://rickandmortyapi.com/api/character", { params, timeout: 15000 })
            const characters = (data.results || []).map(c => ({
                id: c.id,
                name: c.name,
                status: c.status,
                species: c.species,
                type: c.type || null,
                gender: c.gender,
                origin: c.origin?.name,
                location: c.location?.name,
                image: c.image,
                url: c.url,
                created: c.created,
                episode_count: c.episode?.length || 0,
            }))
            res.json({
                ok: true,
                info: data.info,
                results: characters.length,
                characters,
            })
        } catch (e) {
            if (e.response?.status === 404) return res.json({ ok: true, results: 0, characters: [], message: "Karakter tidak ditemukan" })
            res.status(500).json({ ok: false, error: e.message })
        }
    },
}

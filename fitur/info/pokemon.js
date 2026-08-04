// /info/pokemon — Pokemon info from PokeAPI
export default {
    route: {
        method: "get",
        path: "/info/pokemon",
        auth: false,
        tags: ["Info"],
        summary: "Pokemon info (PokeAPI)",
        description: "Info Pokemon (nama, jenis, stats, abilities, sprite) dari PokeAPI.",
        parameters: [
            { name: "name", in: "query", required: true, description: "Nama atau ID Pokemon", schema: { type: "string", example: "pikachu" } },
        ],
        responses: { "200": { description: "Info Pokemon" }, "404": { description: "Pokemon tidak ditemukan" }, "502": { description: "Upstream error" } },
    },
    handler: async (req, res) => {
        try {
            const name = String(req.query.name || "").toLowerCase().trim()
            if (!name) return res.status(400).json({ ok: false, error: "name wajib diisi" })
            const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(name)}`, { headers: { "Accept": "application/json" } })
            if (r.status === 404) return res.status(404).json({ ok: false, error: "Pokemon tidak ditemukan" })
            if (!r.ok) return res.status(502).json({ ok: false, error: "PokeAPI error: " + r.status })
            const data = await r.json()
            res.json({
                ok: true,
                id: data.id,
                name: data.name,
                height: data.height, // decimeters
                weight: data.weight, // hectograms
                height_m: data.height / 10,
                weight_kg: data.weight / 10,
                base_experience: data.base_experience,
                types: data.types.map(t => t.type.name),
                abilities: data.abilities.map(a => ({ name: a.ability.name, hidden: a.is_hidden })),
                stats: data.stats.map(s => ({ name: s.stat.name, value: s.base_stat })),
                sprite: data.sprites?.front_default,
                official_artwork: data.sprites?.other?.["official-artwork"]?.front_default,
            })
        } catch (e) { res.status(502).json({ ok: false, error: e.message }) }
    },
}

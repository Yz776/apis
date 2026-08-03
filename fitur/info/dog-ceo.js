// /info/dog-ceo — Random dog image (Dog CEO)
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/dog-ceo",
        auth: false,
        tags: ["Info"],
        summary: "Random dog image (Dog CEO)",
        description: "Ambil gambar anjing acak dari Dog CEO API. Bisa filter berdasarkan breed.",
        parameters: [
            { name: "breed", in: "query", required: false, description: "Breed spesifik (cth: husky, shiba)", schema: { type: "string" } },
            { name: "count", in: "query", required: false, description: "Jumlah gambar (default 1, max 50)", schema: { type: "integer", default: 1 } },
        ],
        responses: { "200": { description: "URL gambar anjing" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const count = Math.min(50, Math.max(1, parseInt(req.query.count) || 1))
            const breed = String(req.query.breed || "").trim().toLowerCase()
            let url
            if (breed) {
                url = count === 1
                    ? `https://dog.ceo/api/breed/${breed}/images/random`
                    : `https://dog.ceo/api/breed/${breed}/images/random/${count}`
            } else {
                url = count === 1
                    ? "https://dog.ceo/api/breeds/image/random"
                    : `https://dog.ceo/api/breeds/image/random/${count}`
            }
            const { data } = await axios.get(url, { timeout: 15000 })
            if (data.status !== "success") return res.status(404).json({ ok: false, error: "Breed tidak ditemukan" })
            const images = Array.isArray(data.message) ? data.message : [data.message]
            res.json({
                ok: true,
                count: images.length,
                breed: breed || "random",
                images,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

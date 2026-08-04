// /info/dog-ceo — Random dog image (Dog CEO + random.dog fallback)
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/dog-ceo",
        auth: false,
        tags: ["Info"],
        summary: "Random dog image",
        description: "Ambil gambar anjing acak. Sumber utama: Dog CEO API. Fallback: random.dog bila Dog CEO tidak terjangkau.",
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
            const images = []
            let source = "dog.ceo"

            // Primary: Dog CEO
            try {
                let url
                if (breed) {
                    url = count === 1
                        ? `https://dog.ceo/api/breed/${encodeURIComponent(breed)}/images/random`
                        : `https://dog.ceo/api/breed/${encodeURIComponent(breed)}/images/random/${count}`
                } else {
                    url = count === 1
                        ? "https://dog.ceo/api/breeds/image/random"
                        : `https://dog.ceo/api/breeds/image/random/${count}`
                }
                const { data, status } = await axios.get(url, {
                    timeout: 8000,
                    headers: { "User-Agent": "Mozilla/5.0" },
                    validateStatus: () => true,
                })
                if (status === 200 && data?.status === "success") {
                    const msgs = Array.isArray(data.message) ? data.message : [data.message]
                    images.push(...msgs)
                } else if (status === 404) {
                    return res.status(404).json({ ok: false, error: "Breed tidak ditemukan" })
                } else {
                    throw new Error(`Dog CEO returned status ${status}`)
                }
            } catch {
                // Fallback: random.dog (no breed filter)
                source = "random.dog"
                for (let i = 0; i < count; i++) {
                    try {
                        const { data: rd } = await axios.get("https://random.dog/woof.json", {
                            timeout: 8000,
                            validateStatus: () => true,
                        })
                        if (rd?.url) images.push(rd.url)
                    } catch {}
                }
                if (!images.length) throw new Error("Semua upstream gagal")
            }

            res.json({
                ok: true,
                count: images.length,
                breed: breed || "random",
                source,
                images,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

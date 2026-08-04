// /text/leetspeak — convert text to leetspeak
const MAP = {
    a: ["4", "@"], A: ["4", "@"],
    b: ["8"], B: ["8"],
    c: ["(", "<"], C: ["(", "<"],
    e: ["3"], E: ["3"],
    g: ["6", "9"], G: ["6", "9"],
    h: ["#", "H"], H: ["#", "H"],
    i: ["1", "!"], I: ["1", "!"],
    l: ["1", "|"], L: ["1", "|"],
    o: ["0"], O: ["0"],
    s: ["5", "$"], S: ["5", "$"],
    t: ["7", "+"], T: ["7", "+"],
    z: ["2"], Z: ["2"],
}

export default {
    route: {
        method: "get",
        path: "/text/leetspeak",
        auth: false,
        tags: ["Text"],
        summary: "Leetspeak converter",
        description: "Ubah teks ke leetspeak (ganti huruf dengan angka/simbol yang mirip).",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo dunia" } },
            { name: "level", in: "query", required: false, description: "Level: 1=basic, 2=advanced (default 1)", schema: { type: "integer", enum: [1, 2], default: 1 } },
        ],
        responses: { "200": { description: "Teks leetspeak" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const level = parseInt(req.query.level, 10) === 2 ? 1 : 0  // index 0 or 1
        const result = [...String(text)].map(c => {
            const opts = MAP[c]
            if (!opts) return c
            return opts[Math.min(level, opts.length - 1)]
        }).join("")
        res.json({ ok: true, input: String(text), level: level + 1, result })
    },
}

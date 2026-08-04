// /utils/statistics — descriptive statistics
function mean(a) { return a.reduce((s, x) => s + x, 0) / a.length }
function median(a) {
    const s = [...a].sort((x, y) => x - y)
    const mid = Math.floor(s.length / 2)
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
function mode(a) {
    const freq = {}
    a.forEach(x => freq[x] = (freq[x] || 0) + 1)
    const maxFreq = Math.max(...Object.values(freq))
    if (maxFreq === 1) return []
    return Object.keys(freq).filter(k => freq[k] === maxFreq).map(Number).sort((x, y) => x - y)
}
function variance(a, sample = true) {
    const m = mean(a)
    const sum = a.reduce((s, x) => s + (x - m) ** 2, 0)
    return sum / (a.length - (sample ? 1 : 0))
}

export default {
    route: {
        method: "get",
        path: "/utils/statistics",
        auth: false,
        tags: ["Utils"],
        summary: "Descriptive statistics",
        description: "Hitung mean, median, mode, range, varians, std deviasi, min, max, sum dari kumpulan angka.",
        parameters: [
            { name: "numbers", in: "query", required: true, description: "Daftar angka dipisah koma", schema: { type: "string", example: "1,2,3,4,5,5,6" } },
            { name: "sample", in: "query", required: false, description: "Varians sample (n-1) atau populasi (n). Default true.", schema: { type: "boolean", default: true } },
        ],
        responses: { "200": { description: "Statistik" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const nums = String(req.query.numbers || "").split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
        if (!nums.length) return res.status(400).json({ ok: false, error: "butuh minimal 1 angka" })
        const sample = String(req.query.sample).toLowerCase() !== "false"
        const sorted = [...nums].sort((a, b) => a - b)
        const m = mean(nums)
        const v = variance(nums, sample)
        const result = {
            count: nums.length,
            sum: nums.reduce((s, x) => s + x, 0),
            mean: Number(m.toFixed(10)),
            median,
            mode: mode(nums),
            min: sorted[0],
            max: sorted[sorted.length - 1],
            range: sorted[sorted.length - 1] - sorted[0],
            variance: Number(v.toFixed(10)),
            std_dev: Number(Math.sqrt(v).toFixed(10)),
            sorted,
        }
        result.median = Number(median(nums).toFixed(10))
        res.json({ ok: true, ...result })
    },
}

// /utils/gcd-lcm — GCD & LCM calculator
function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b)
    while (b) { [a, b] = [b, a % b] }
    return a
}
function lcm(a, b) {
    if (a === 0 || b === 0) return 0
    return Math.abs(a * b) / gcd(a, b)
}
function gcdMany(nums) { return nums.reduce((acc, n) => gcd(acc, n)) }
function lcmMany(nums) { return nums.reduce((acc, n) => lcm(acc, n)) }

export default {
    route: {
        method: "get",
        path: "/utils/gcd-lcm",
        auth: false,
        tags: ["Utils"],
        summary: "GCD & LCM calculator",
        description: "Hitung FPB (GCD) dan KPK (LCM) dari 2 atau lebih bilangan bulat.",
        parameters: [
            { name: "numbers", in: "query", required: true, description: "Daftar angka dipisah koma", schema: { type: "string", example: "12,18,24" } },
        ],
        responses: { "200": { description: "GCD & LCM hasil" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const nums = String(req.query.numbers || "").split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
        if (nums.length < 2) return res.status(400).json({ ok: false, error: "butuh minimal 2 angka dipisah koma" })
        const g = gcdMany(nums)
        const l = lcmMany(nums)
        res.json({ ok: true, numbers: nums, gcd: g, lcm: l })
    },
}

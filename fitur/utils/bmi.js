// /utils/bmi — BMI calculator
export default {
    route: {
        method: "get",
        path: "/utils/bmi",
        auth: false,
        tags: ["Utils"],
        summary: "BMI calculator",
        description: "Menghitung Body Mass Index (BMI) dari berat (kg) dan tinggi (cm). Menampilkan kategori WHO.",
        parameters: [
            { name: "weight", in: "query", required: true, description: "Berat badan dalam kg", schema: { type: "number", example: 70 } },
            { name: "height", in: "query", required: true, description: "Tinggi badan dalam cm", schema: { type: "number", example: 170 } },
        ],
        responses: { "200": { description: "Hasil BMI" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const w = parseFloat(req.query.weight)
        const h = parseFloat(req.query.height)
        if (!w || !h || w <= 0 || h <= 0 || w > 1000 || h > 300) return res.status(400).json({ ok: false, error: "weight (kg, 0-1000) dan height (cm, 0-300) wajib diisi" })
        const m = h / 100
        const bmi = w / (m * m)
        let category
        if (bmi < 18.5) category = "Underweight (Kurus)"
        else if (bmi < 25) category = "Normal"
        else if (bmi < 30) category = "Overweight (Gemuk)"
        else if (bmi < 35) category = "Obese Class I"
        else if (bmi < 40) category = "Obese Class II"
        else category = "Obese Class III"
        const idealMin = 18.5 * m * m
        const idealMax = 24.9 * m * m
        res.json({
            ok: true, weight_kg: w, height_cm: h, bmi: +bmi.toFixed(2), category,
            ideal_weight_kg: { min: +idealMin.toFixed(1), max: +idealMax.toFixed(1) },
        })
    },
}

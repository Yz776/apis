// /utils/vector-op — Vector operations (dot, cross, magnitude, normalize, add, sub)
function parseVec(str) {
    try {
        const v = JSON.parse(str)
        if (!Array.isArray(v) || !v.every(x => typeof x === "number")) throw new Error()
        return v
    } catch { throw new Error("Vektor harus JSON array angka, cth: [1,2,3]") }
}

export default {
    route: {
        method: "get",
        path: "/utils/vector-op",
        auth: false,
        tags: ["Utils"],
        summary: "Vector operations (2D/3D)",
        description: "Operasi vektor: dot, cross, magnitude, normalize, add, sub, angle. Format JSON: [1,2,3]",
        parameters: [
            { name: "a", in: "query", required: true, description: "Vektor A (JSON array)", schema: { type: "string", example: "[1,2,3]" } },
            { name: "b", in: "query", required: false, description: "Vektor B (JSON array)", schema: { type: "string", example: "[4,5,6]" } },
            { name: "op", in: "query", required: false, description: "Operasi", schema: { type: "string", enum: ["dot", "cross", "magnitude", "normalize", "add", "sub", "angle", "distance"], default: "magnitude" } },
        ],
        responses: { "200": { description: "Hasil operasi vektor" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const aStr = String(req.query.a || "")
        if (!aStr) return res.status(400).json({ ok: false, error: "a wajib diisi" })
        try {
            const A = parseVec(aStr)
            const op = String(req.query.op || "magnitude").toLowerCase()
            let B, result

            if (["dot", "cross", "add", "sub", "angle", "distance"].includes(op)) {
                if (!req.query.b) return res.status(400).json({ ok: false, error: "b wajib diisi untuk op ini" })
                B = parseVec(String(req.query.b))
                if (A.length !== B.length) return res.status(400).json({ ok: false, error: "dimensi vektor harus sama" })
            }

            switch (op) {
                case "magnitude":
                    result = Math.sqrt(A.reduce((s, x) => s + x * x, 0))
                    break
                case "normalize":
                    const mag = Math.sqrt(A.reduce((s, x) => s + x * x, 0))
                    result = mag === 0 ? A : A.map(x => x / mag)
                    break
                case "add":
                    result = A.map((x, i) => x + B[i])
                    break
                case "sub":
                    result = A.map((x, i) => x - B[i])
                    break
                case "dot":
                    result = A.reduce((s, x, i) => s + x * B[i], 0)
                    break
                case "cross":
                    if (A.length !== 3) return res.status(400).json({ ok: false, error: "cross butuh vektor 3D" })
                    result = [
                        A[1] * B[2] - A[2] * B[1],
                        A[2] * B[0] - A[0] * B[2],
                        A[0] * B[1] - A[1] * B[0],
                    ]
                    break
                case "angle":
                    const dot = A.reduce((s, x, i) => s + x * B[i], 0)
                    const magA = Math.sqrt(A.reduce((s, x) => s + x * x, 0))
                    const magB = Math.sqrt(B.reduce((s, x) => s + x * x, 0))
                    if (magA === 0 || magB === 0) return res.status(400).json({ ok: false, error: "vektor nol tidak punya sudut" })
                    result = Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB)))) * 180 / Math.PI
                    break
                case "distance":
                    result = Math.sqrt(A.reduce((s, x, i) => s + (x - B[i]) ** 2, 0))
                    break
                default:
                    return res.status(400).json({ ok: false, error: "op tidak valid" })
            }
            res.json({ ok: true, op, vector_A: A, vector_B: B, result })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

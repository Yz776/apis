// /utils/matrix-op — Matrix operations (add, subtract, multiply, transpose, determinant)
function parseMatrix(str) {
    // format: [[1,2],[3,4]]
    try {
        const m = JSON.parse(str)
        if (!Array.isArray(m) || !m.every(r => Array.isArray(r) && r.every(x => typeof x === "number"))) {
            throw new Error("invalid")
        }
        return m
    } catch {
        throw new Error("Matrix harus format JSON array 2D, cth: [[1,2],[3,4]]")
    }
}

function dims(m) { return { rows: m.length, cols: m[0]?.length || 0 } }

export default {
    route: {
        method: "get",
        path: "/utils/matrix-op",
        auth: false,
        tags: ["Utils"],
        summary: "Matrix operations",
        description: "Operasi matriks: add, sub, mul, transpose, determinant. Format JSON: [[1,2],[3,4]]",
        parameters: [
            { name: "a", in: "query", required: true, description: "Matriks A (JSON 2D array)", schema: { type: "string", example: "[[1,2],[3,4]]" } },
            { name: "b", in: "query", required: false, description: "Matriks B (JSON 2D array)", schema: { type: "string", example: "[[5,6],[7,8]]" } },
            { name: "op", in: "query", required: false, description: "Operasi", schema: { type: "string", enum: ["add", "sub", "mul", "transpose", "determinant", "trace"], default: "transpose" } },
        ],
        responses: { "200": { description: "Hasil operasi matriks" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const aStr = String(req.query.a || "")
        if (!aStr) return res.status(400).json({ ok: false, error: "a wajib diisi" })
        try {
            const A = parseMatrix(aStr)
            const op = String(req.query.op || "transpose").toLowerCase()
            const dA = dims(A)
            let B, dB, result

            if (["add", "sub", "mul"].includes(op)) {
                if (!req.query.b) return res.status(400).json({ ok: false, error: "b wajib diisi untuk operasi ini" })
                B = parseMatrix(String(req.query.b))
                dB = dims(B)
            }

            switch (op) {
                case "add":
                case "sub":
                    if (dA.rows !== dB.rows || dA.cols !== dB.cols)
                        return res.status(400).json({ ok: false, error: "dimensi harus sama untuk add/sub" })
                    result = A.map((r, i) => r.map((v, j) => op === "add" ? v + B[i][j] : v - B[i][j]))
                    break
                case "mul":
                    if (dA.cols !== dB.rows)
                        return res.status(400).json({ ok: false, error: "kolom A harus = baris B" })
                    result = Array(dA.rows).fill().map(() => Array(dB.cols).fill(0))
                    for (let i = 0; i < dA.rows; i++)
                        for (let j = 0; j < dB.cols; j++)
                            for (let k = 0; k < dA.cols; k++)
                                result[i][j] += A[i][k] * B[k][j]
                    break
                case "transpose":
                    result = A[0].map((_, j) => A.map(row => row[j]))
                    break
                case "trace":
                    if (dA.rows !== dA.cols) return res.status(400).json({ ok: false, error: "trace butuh matriks persegi" })
                    result = A.reduce((s, r, i) => s + r[i], 0)
                    break
                case "determinant":
                    if (dA.rows !== dA.cols) return res.status(400).json({ ok: false, error: "determinant butuh matriks persegi" })
                    if (dA.rows > 10) return res.status(400).json({ ok: false, error: "maksimum 10x10" })
                    // Laplace expansion (recursive)
                    const det = (m) => {
                        const n = m.length
                        if (n === 1) return m[0][0]
                        if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0]
                        let d = 0
                        for (let c = 0; c < n; c++) {
                            const minor = m.slice(1).map(r => r.filter((_, j) => j !== c))
                            d += (c % 2 ? -1 : 1) * m[0][c] * det(minor)
                        }
                        return d
                    }
                    result = det(A)
                    break
                default:
                    return res.status(400).json({ ok: false, error: "op tidak valid" })
            }
            res.json({ ok: true, op, dims_A: dA, dims_B: dB, result })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

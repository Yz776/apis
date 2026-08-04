// /text/rail-fence — Rail fence cipher
function encryptRailFence(text, rails) {
    if (rails < 2) return text
    const matrix = Array(rails).fill(null).map(() => [])
    let rail = 0, dir = 1
    for (const ch of text) {
        matrix[rail].push(ch)
        if (rail === 0) dir = 1
        else if (rail === rails - 1) dir = -1
        rail += dir
    }
    return matrix.map(r => r.join("")).join("")
}

function decryptRailFence(text, rails) {
    if (rails < 2) return text
    // mark positions in zigzag
    const marker = Array(text.length).fill(0)
    let rail = 0, dir = 1
    for (let i = 0; i < text.length; i++) {
        marker[i] = rail
        if (rail === 0) dir = 1
        else if (rail === rails - 1) dir = -1
        rail += dir
    }
    // distribute chars
    const counts = Array(rails).fill(0)
    for (const m of marker) counts[m]++
    const railsArr = []
    let idx = 0
    for (let r = 0; r < rails; r++) {
        railsArr.push(text.slice(idx, idx + counts[r]).split(""))
        idx += counts[r]
    }
    // reconstruct
    const railPtr = Array(rails).fill(0)
    let out = ""
    rail = 0; dir = 1
    for (let i = 0; i < text.length; i++) {
        out += railsArr[marker[i]][railPtr[marker[i]]++]
    }
    return out
}

export default {
    route: {
        method: "get",
        path: "/text/rail-fence",
        auth: false,
        tags: ["Text"],
        summary: "Rail fence cipher",
        description: "Rail fence cipher — transposition cipher yang menulis teks dalam pola zigzag sepanjang 'rails'.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "HELLO WORLD" } },
            { name: "rails", in: "query", required: false, description: "Jumlah rails (default 3, min 2)", schema: { type: "integer", default: 3, minimum: 2, maximum: 20 } },
            { name: "mode", in: "query", required: false, description: "encrypt atau decrypt (default encrypt)", schema: { type: "string", enum: ["encrypt", "decrypt"], default: "encrypt" } },
        ],
        responses: { "200": { description: "Hasil rail fence" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = String(req.query.text || "")
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const rails = Math.min(20, Math.max(2, parseInt(req.query.rails) || 3))
        const mode = String(req.query.mode || "encrypt").toLowerCase()
        try {
            const result = mode === "encrypt" ? encryptRailFence(text, rails) : decryptRailFence(text, rails)
            res.json({ ok: true, mode, rails, input: text, result })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

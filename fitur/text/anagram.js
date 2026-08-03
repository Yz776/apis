// /text/anagram — anagram checker
function normalize(s, ignoreCase = true, ignoreNonAlnum = true) {
    if (ignoreCase) s = s.toLowerCase()
    if (ignoreNonAlnum) s = s.replace(/[^a-zA-Z0-9]/g, "")
    return s
}

function sortChars(s) {
    return [...s].sort().join("")
}

export default {
    route: {
        method: "get",
        path: "/text/anagram",
        auth: false,
        tags: ["Text"],
        summary: "Anagram checker",
        description: "Cek apakah dua string adalah anagram (memiliki huruf yang sama).",
        parameters: [
            { name: "a", in: "query", required: true, description: "String pertama", schema: { type: "string", example: "listen" } },
            { name: "b", in: "query", required: true, description: "String kedua", schema: { type: "string", example: "silent" } },
            { name: "ignore_case", in: "query", required: false, description: "Abai-case (default true)", schema: { type: "boolean", default: true } },
            { name: "ignore_non_alnum", in: "query", required: false, description: "Abai-spasi & tanda baca (default true)", schema: { type: "boolean", default: true } },
        ],
        responses: { "200": { description: "Hasil cek anagram" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const { a, b } = req.query
        if (!a) return res.status(400).json({ ok: false, error: "a wajib diisi" })
        if (!b) return res.status(400).json({ ok: false, error: "b wajib diisi" })
        const ignoreCase = String(req.query.ignore_case).toLowerCase() !== "false"
        const ignoreNonAlnum = String(req.query.ignore_non_alnum).toLowerCase() !== "false"
        const na = normalize(String(a), ignoreCase, ignoreNonAlnum)
        const nb = normalize(String(b), ignoreCase, ignoreNonAlnum)
        const isAnagram = sortChars(na) === sortChars(nb)
        res.json({ ok: true, a: String(a), b: String(b), normalized_a: na, normalized_b: nb, is_anagram: isAnagram })
    },
}

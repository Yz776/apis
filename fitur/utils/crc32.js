// /utils/crc32 — CRC32 checksum
const CRC_TABLE = (() => {
    const t = new Int32Array(256)
    for (let i = 0; i < 256; i++) {
        let c = i
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
        t[i] = c
    }
    return t
})()

function crc32(buf) {
    let crc = -1
    for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
    return (crc ^ -1) >>> 0
}

export default {
    route: {
        method: "get",
        path: "/utils/crc32",
        auth: false,
        tags: ["Utils"],
        summary: "CRC32 checksum",
        description: "Hitung CRC32 (IEEE 802.3) dari teks. Output unsigned 32-bit.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks input", schema: { type: "string", example: "halo dunia" } },
        ],
        responses: { "200": { description: "CRC32 hasil" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const dec = crc32(Buffer.from(String(text), "utf8"))
        res.json({ ok: true, input: String(text), crc32: dec, hex: "0x" + dec.toString(16).padStart(8, "0") })
    },
}

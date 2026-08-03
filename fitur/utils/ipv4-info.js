// /utils/ipv4-info — IPv4 address info (class, private, type)
function ipToInt(ip) {
    const parts = ip.split(".").map(n => parseInt(n, 10))
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return null
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

export default {
    route: {
        method: "get",
        path: "/utils/ipv4-info",
        auth: false,
        tags: ["Utils"],
        summary: "IPv4 address info",
        description: "Informasi alamat IPv4: kelas (A/B/C/D/E), apakah private, apakah loopback, broadcast, dll.",
        parameters: [
            { name: "ip", in: "query", required: true, description: "Alamat IPv4", schema: { type: "string", example: "192.168.1.1" } },
        ],
        responses: { "200": { description: "Info IPv4" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const ip = String(req.query.ip || "").trim()
        if (!ip) return res.status(400).json({ ok: false, error: "ip wajib diisi" })
        const parts = ip.split(".").map(n => parseInt(n, 10))
        if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
            return res.status(400).json({ ok: false, error: "format IPv4 tidak valid" })
        }
        try {
            const first = parts[0]
            let ipClass = "Unknown"
            if (first >= 1 && first <= 126) ipClass = "A"
            else if (first === 127) ipClass = "Loopback"
            else if (first >= 128 && first <= 191) ipClass = "B"
            else if (first >= 192 && first <= 223) ipClass = "C"
            else if (first >= 224 && first <= 239) ipClass = "D (Multicast)"
            else if (first >= 240) ipClass = "E (Reserved)"
            const isPrivate =
                (first === 10) ||
                (first === 172 && parts[1] >= 16 && parts[1] <= 31) ||
                (first === 192 && parts[1] === 168)
            const isLoopback = first === 127
            const isLinkLocal = first === 169 && parts[1] === 254
            const isBroadcast = ip === "255.255.255.255"
            const isNetwork = parts[3] === 0
            const int = ipToInt(ip)
            const binary = parts.map(p => p.toString(2).padStart(8, "0")).join(".")
            const hex = parts.map(p => p.toString(16).padStart(2, "0")).join(":")
            res.json({
                ok: true,
                ip,
                parts,
                class: ipClass,
                is_private: isPrivate,
                is_loopback: isLoopback,
                is_link_local: isLinkLocal,
                is_broadcast: isBroadcast,
                is_network_address: isNetwork,
                binary,
                hex,
                decimal: int >>> 0,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

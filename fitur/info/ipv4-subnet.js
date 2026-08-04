// /utils/ipv4-subnet — IPv4 subnet calculator
function ipToInt(ip) {
    const parts = ip.split(".").map(Number)
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) throw new Error("IPv4 tidak valid")
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}
function intToIp(n) {
    // force unsigned
    n = n >>> 0
    return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join(".")
}

export default {
    route: {
        method: "get",
        path: "/utils/ipv4-subnet",
        auth: false,
        tags: ["Utils"],
        summary: "IPv4 subnet calculator",
        description: "Hitung network, broadcast, host range, mask dari CIDR (mis. 192.168.1.0/24).",
        parameters: [
            { name: "cidr", in: "query", required: true, description: "CIDR", schema: { type: "string", example: "192.168.1.0/24" } },
        ],
        responses: { "200": { description: "Subnet info" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const cidr = String(req.query.cidr || "").trim()
        if (!cidr) return res.status(400).json({ ok: false, error: "cidr wajib diisi" })
        const [ip, prefixStr] = cidr.split("/")
        if (!ip || !prefixStr) return res.status(400).json({ ok: false, error: "format harus IP/prefix" })
        const prefix = parseInt(prefixStr, 10)
        if (isNaN(prefix) || prefix < 0 || prefix > 32) return res.status(400).json({ ok: false, error: "prefix harus 0-32" })
        try {
            const ipInt = ipToInt(ip)
            const mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0
            const network = (ipInt & mask) >>> 0
            const broadcast = (network | (~mask >>> 0)) >>> 0
            const totalHosts = prefix >= 31 ? (prefix === 32 ? 1 : 2) : Math.pow(2, 32 - prefix)
            const usableHosts = prefix >= 31 ? totalHosts : Math.max(0, totalHosts - 2)
            const firstHost = prefix === 32 ? network : (network + 1) >>> 0
            const lastHost = prefix === 32 ? network : (broadcast - 1) >>> 0
            // build binary mask
            const maskBin = mask.toString(2).padStart(32, "0").match(/.{8}/g).join(".")
            // determine class
            const firstOctet = parseInt(ip.split(".")[0], 10)
            let klass = firstOctet < 128 ? "A" : firstOctet < 192 ? "B" : firstOctet < 224 ? "C" : firstOctet < 240 ? "D (multicast)" : "E (reserved)"
            const isPrivate = (firstOctet === 10) || (firstOctet === 172 && parseInt(ip.split(".")[1], 10) >= 16 && parseInt(ip.split(".")[1], 10) <= 31) || (firstOctet === 192 && parseInt(ip.split(".")[1], 10) === 168)
            res.json({
                ok: true,
                cidr,
                ip,
                prefix,
                class: klass,
                is_private: isPrivate,
                subnet_mask: intToIp(mask),
                subnet_mask_binary: maskBin,
                network_address: intToIp(network),
                broadcast_address: intToIp(broadcast),
                first_host: intToIp(firstHost),
                last_host: intToIp(lastHost),
                total_hosts: totalHosts,
                usable_hosts: usableHosts,
            })
        } catch (e) { res.status(400).json({ ok: false, error: e.message }) }
    },
}

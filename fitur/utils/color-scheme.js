// /utils/color-scheme — generate color scheme from base color
function hexToHsl(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255
    let g = parseInt(hex.slice(3, 5), 16) / 255
    let b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h, s, l = (max + min) / 2
    if (max === min) { h = s = 0 }
    else {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
        else if (max === g) h = (b - r) / d + 2
        else h = (r - g) / d + 4
        h /= 6
    }
    return [h * 360, s * 100, l * 100]
}

function hslToHex(h, s, l) {
    h /= 360; s /= 100; l /= 100
    let r, g, b
    if (s === 0) r = g = b = l
    else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1
            if (t > 1) t -= 1
            if (t < 1/6) return p + (q - p) * 6 * t
            if (t < 1/2) return q
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
            return p
        }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s
        const p = 2 * l - q
        r = hue2rgb(p, q, h + 1/3)
        g = hue2rgb(p, q, h)
        b = hue2rgb(p, q, h - 1/3)
    }
    const toHex = c => Math.round(c * 255).toString(16).padStart(2, "0")
    return "#" + toHex(r) + toHex(g) + toHex(b)
}

export default {
    route: {
        method: "get",
        path: "/utils/color-scheme",
        auth: false,
        tags: ["Utils"],
        summary: "Generate color scheme from base color",
        description: "Hasilkan skema warna (complementary, analogous, triadic, tetradic, split-complement) dari warna dasar HEX.",
        parameters: [
            { name: "color", in: "query", required: true, description: "Warna dasar (HEX)", schema: { type: "string", example: "#3498db" } },
            { name: "scheme", in: "query", required: false, description: "Jenis skema (default complementary)", schema: { type: "string", enum: ["complementary", "analogous", "triadic", "tetradic", "split-complementary", "monochromatic"], default: "complementary" } },
        ],
        responses: { "200": { description: "Skema warna" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        let hex = String(req.query.color || "").trim()
        if (!hex) return res.status(400).json({ ok: false, error: "color wajib diisi" })
        if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) return res.status(400).json({ ok: false, error: "color harus hex 6 digit (mis. #3498db)" })
        if (!hex.startsWith("#")) hex = "#" + hex
        const scheme = String(req.query.scheme || "complementary").toLowerCase()
        const [h, s, l] = hexToHsl(hex)
        const rot = (deg) => (h + deg + 360) % 360
        let result = {}
        if (scheme === "complementary") {
            result = { base: hex, complementary: hslToHex(rot(180), s, l) }
        } else if (scheme === "analogous") {
            result = { base: hex, analogous: [hslToHex(rot(-30), s, l), hslToHex(rot(30), s, l)] }
        } else if (scheme === "triadic") {
            result = { base: hex, triadic: [hslToHex(rot(120), s, l), hslToHex(rot(240), s, l)] }
        } else if (scheme === "tetradic") {
            result = { base: hex, tetradic: [hslToHex(rot(90), s, l), hslToHex(rot(180), s, l), hslToHex(rot(270), s, l)] }
        } else if (scheme === "split-complementary") {
            result = { base: hex, split_complementary: [hslToHex(rot(150), s, l), hslToHex(rot(210), s, l)] }
        } else if (scheme === "monochromatic") {
            const steps = [-30, -15, 0, 15, 30]
            result = { base: hex, monochromatic: steps.map(d => hslToHex(h, s, Math.max(5, Math.min(95, l + d)))) }
        } else {
            return res.status(400).json({ ok: false, error: "scheme tidak valid" })
        }
        res.json({ ok: true, base: hex, base_hsl: { h: Math.round(h), s: Math.round(s), l: Math.round(l) }, scheme, result })
    },
}

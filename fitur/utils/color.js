// /utils/color — Color converter (HEX <-> RGB <-> HSL)
function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null
}
function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("")
}
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h, s, l = (max + min) / 2
    if (max === min) { h = s = 0 }
    else {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break
            case g: h = (b - r) / d + 2; break
            case b: h = (r - g) / d + 4; break
        }
        h /= 6
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export default {
    route: {
        method: "get",
        path: "/utils/color",
        auth: false,
        tags: ["Utils"],
        summary: "Color converter (HEX/RGB/HSL)",
        description: "Konversi warna antara HEX, RGB, dan HSL. Menerima #RRGGBB atau rgb(r,g,b).",
        parameters: [
            { name: "color", in: "query", required: true, description: "Warna input (#RRGGBB atau r,g,b)", schema: { type: "string", example: "#ff6600" } },
        ],
        responses: { "200": { description: "Hasil konversi" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const c = String(req.query.color || "").trim()
        if (!c) return res.status(400).json({ ok: false, error: "color wajib diisi" })
        let rgb
        const mRgb = /^(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})$/.exec(c)
        if (mRgb) {
            rgb = { r: +mRgb[1], g: +mRgb[2], b: +mRgb[3] }
            if (rgb.r > 255 || rgb.g > 255 || rgb.b > 255) return res.status(400).json({ ok: false, error: "RGB value max 255" })
        } else {
            rgb = hexToRgb(c)
            if (!rgb) return res.status(400).json({ ok: false, error: "Format tidak dikenali. Gunakan #RRGGBB atau r,g,b" })
        }
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
        res.json({ ok: true, hex, rgb: rgb, hsl: hsl, css_rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, css_hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` })
    },
}

// /utils/emoji-info — Get emoji info (codepoints, name, shortcodes)
const EMOJI_DATA = {
    "😀": { name: "GRINNING FACE", category: "Smileys & Emotion" },
    "😂": { name: "FACE WITH TEARS OF JOY", category: "Smileys & Emotion" },
    "❤️": { name: "RED HEART", category: "Smileys & Emotion" },
    "👍": { name: "THUMBS UP", category: "People & Body" },
    "🔥": { name: "FIRE", category: "Animals & Nature" },
    "🎉": { name: "PARTY POPPER", category: "Activities" },
    "💯": { name: "HUNDRED POINTS", category: "Smileys & Emotion" },
    "🤔": { name: "THINKING FACE", category: "Smileys & Emotion" },
    "😎": { name: "SMILING FACE WITH SUNGLASSES", category: "Smileys & Emotion" },
    "🌟": { name: "GLOWING STAR", category: "Animals & Nature" },
    "⚡": { name: "HIGH VOLTAGE", category: "Travel & Places" },
    "💀": { name: "SKULL", category: "Smileys & Emotion" },
    "🥺": { name: "PLEADING FACE", category: "Smileys & Emotion" },
    "😭": { name: "LOUDLY CRYING FACE", category: "Smileys & Emotion" },
    "👀": { name: "EYES", category: "People & Body" },
    "🚀": { name: "ROCKET", category: "Travel & Places" },
    "💎": { name: "GEM STONE", category: "Objects" },
    "🌈": { name: "RAINBOW", category: "Travel & Places" },
    "🍕": { name: "PIZZA", category: "Food & Drink" },
    "🎮": { name: "VIDEO GAME", category: "Activities" },
    "🎵": { name: "MUSICAL NOTE", category: "Objects" },
    "💻": { name: "LAPTOP", category: "Objects" },
    "📱": { name: "MOBILE PHONE", category: "Objects" },
    "🌍": { name: "GLOBE SHOWING EUROPE-AFRICA", category: "Travel & Places" },
    "🌙": { name: "CRESCENT MOON", category: "Travel & Places" },
    "☀️": { name: "SUN", category: "Travel & Places" },
    "❄️": { name: "SNOWFLAKE", category: "Travel & Places" },
    "🎲": { name: "GAME DIE", category: "Activities" },
    "🎁": { name: "WRAPPED GIFT", category: "Activities" },
    "🏆": { name: "TROPHY", category: "Activities" },
}

export default {
    route: {
        method: "get",
        path: "/utils/emoji-info",
        auth: false,
        tags: ["Utils"],
        summary: "Emoji info (codepoints, name)",
        description: "Mengembalikan informasi tentang emoji: codepoints (UTF-16, UTF-32, hex), nama Unicode, dan kategori.",
        parameters: [
            { name: "emoji", in: "query", required: true, description: "Emoji yang akan diperiksa", schema: { type: "string", example: "😀" } },
        ],
        responses: { "200": { description: "Info emoji" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const emoji = String(req.query.emoji || "")
        if (!emoji) return res.status(400).json({ ok: false, error: "emoji wajib diisi" })
        try {
            const codepoints = []
            for (const ch of emoji) {
                codepoints.push(`U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`)
            }
            const utf16 = []
            for (let i = 0; i < emoji.length; i++) {
                utf16.push(emoji.charCodeAt(i).toString(16).toUpperCase().padStart(4, "0"))
            }
            const utf8 = []
            for (const byte of Buffer.from(emoji, "utf8")) utf8.push(byte.toString(16).toUpperCase().padStart(2, "0"))
            const info = EMOJI_DATA[emoji] || { name: "unknown", category: "unknown" }
            res.json({
                ok: true,
                emoji,
                name: info.name,
                category: info.category,
                codepoints,
                codepoints_str: codepoints.join(" "),
                utf16_hex: utf16.join(" "),
                utf8_hex: utf8.join(" "),
                utf8_bytes: utf8.length,
                length_chars: emoji.length,
                length_codepoints: [...emoji].length,
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

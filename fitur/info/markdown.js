// /info/markdown — Markdown to HTML converter (lightweight, no deps)
function mdToHtml(md) {
    let s = String(md)
    // escape HTML
    s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // code blocks ```
    s = s.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => `<pre><code class="language-${lang}">${code.replace(/\n$/, "")}</code></pre>`)
    // inline code
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>")
    // headings
    s = s.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>")
        .replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>")
        .replace(/^####\s+(.+)$/gm, "<h4>$1</h4>")
        .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
        .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
        .replace(/^#\s+(.+)$/gm, "<h1>$1</h1>")
    // horizontal rule
    s = s.replace(/^---+$/gm, "<hr/>")
    // blockquote
    s = s.replace(/^&gt;\s+(.+)$/gm, "<blockquote>$1</blockquote>")
    // bold + italic
    s = s.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // strikethrough
    s = s.replace(/~~(.+?)~~/g, "<del>$1</del>")
    // links [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    // images ![alt](url)
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1"/>')
    // unordered list
    s = s.replace(/(?:^|\n)((?:[-*+]\s+.+(?:\n|$))+)/g, (m, block) => {
        const items = block.trim().split(/\n/).map(l => l.replace(/^[-*+]\s+/, "")).map(l => `<li>${l}</li>`).join("")
        return `\n<ul>${items}</ul>`
    })
    // ordered list
    s = s.replace(/(?:^|\n)((?:\d+\.\s+.+(?:\n|$))+)/g, (m, block) => {
        const items = block.trim().split(/\n/).map(l => l.replace(/^\d+\.\s+/, "")).map(l => `<li>${l}</li>`).join("")
        return `\n<ol>${items}</ol>`
    })
    // paragraphs: wrap remaining text blocks
    s = s.split(/\n\n+/).map(block => {
        if (/^\s*<(h\d|ul|ol|pre|blockquote|hr)/.test(block)) return block
        return `<p>${block.trim().replace(/\n/g, "<br/>")}</p>`
    }).join("\n")
    return s
}

export default {
    route: {
        method: "get",
        path: "/info/markdown",
        auth: false,
        tags: ["Info"],
        summary: "Markdown to HTML",
        description: "Konversi teks Markdown menjadi HTML. Mendukung heading, bold, italic, link, image, code, list, blockquote.",
        parameters: [
            { name: "text", in: "query", required: true, description: "Teks Markdown", schema: { type: "string", example: "# Halo\nIni **bold** dan *italic*." } },
        ],
        responses: { "200": { description: "HTML hasil" }, "400": { description: "Parameter tidak valid" } },
    },
    handler: async (req, res) => {
        const text = req.query.text
        if (!text) return res.status(400).json({ ok: false, error: "text wajib diisi" })
        const html = mdToHtml(text)
        res.json({ ok: true, markdown: String(text), html })
    },
}

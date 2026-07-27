// Auto-generated from r2-kana.vercel.app snippet "Groupsor.js" (OCbO19)
// Source: https://r2-kana.vercel.app/#/snippet/OCbO19
// Description: New code - Groupsor.js

/**
 * [ *Groupsor Scraper* ]
 *  Creator: nath
 *  Noted: follow ch, Selebihnya atur sendiri
 *  Source Code: https://gist.github.com/nathwolf-123/6cc256809a6acadbe6d4868fa7ee89d1
 */

import { load } from "cheerio"
import cloudscraper from "cloudscraper"

const base_url = "https://groupsor.link"

async function warmupSession(keyword) {
    const url = `${base_url}/group/search?keyword=${encodeURIComponent(keyword)}`
    const res = await cloudscraper.get(url)
    return res
}

function parseGroups(html) {
    const $ = load(html)
    const groups = []

    $("img.image").each((_, img) => {
        const $img = $(img)
        const $anchor = $img.closest("a")
        const $container = $anchor.closest("div")
        const $info = $container.next("div.post-info")

        const name = $img.attr("alt") || ""
        const photo = $img.attr("src") || ""
        const inviteUrl = $anchor.attr("href") || ""

        const $basic = $info.find("div.post-basic-info")

        const description = $basic.find("p.descri").text().trim()
        const joinUrl = ($info.find("span.joinbtn a.joinbtn").attr("href") || "").trim()

        groups.push({
            name,
            photo,
            invite_url: inviteUrl,
            join_url: joinUrl,
            description,
        })
    })

    return groups
}

async function fetchGroups(keyword, groupNo) {
    const res = await cloudscraper.get(
        `${base_url}/group/searchmore/${encodeURIComponent(keyword)}`,
        { body: `group_no=${groupNo}` },
    )
    return parseGroups(res)
}

async function groupSearch(keyword, maxPages = 1) {
    const all = []
    await warmupSession(keyword)

    for (let page = 0; page < maxPages; page++) {
        try {
            const groups = await fetchGroups(keyword, page)
            if (!groups.length) break
            all.push(...groups)
            await new Promise((r) => setTimeout(r, 1000))
        } catch (err) {
            break
        }
    }

    return all
}

export default {
    route: {
        method: "get",
        path: "/kana/groupsor",
        auth: false,
        tags: ["Search"],
        summary: "Groupsor",
        description: "Cari grup WhatsApp/Telegram public via groupsor.link",
        parameters: [
            {
                name: "query",
                in: "query",
                required: true,
                description: "Kata kunci pencarian grup",
                schema: { type: "string" },
            },
        ],
        responses: {
            "200": { description: "Berhasil" },
            "400": { description: "Parameter tidak valid" },
            "500": { description: "Kesalahan server" },
        },
    },

    handler: async (req, res) => {
        const { query } = req.query
        if (!query || !String(query).trim()) {
            return res.status(400).json({ ok: false, error: `query wajib diisi` })
        }
        try {
            const result = await groupSearch(String(query).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

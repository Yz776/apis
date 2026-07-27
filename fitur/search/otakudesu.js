// Auto-generated from r2-kana.vercel.app snippet "otakudesu.js" (thTqtg)
// Source: https://r2-kana.vercel.app/#/snippet/thTqtg
// Description: Search anime with otakudesu

/*
otakudesu search anime
Author: nath
Base https://otakudesu.blog
Note: cantumkan author
*/

import fetch from "node-fetch"
import * as cheerio from "cheerio"

async function searchOtakuDesu(query) {
  const url = `https://otakudesu.blog/?s=${encodeURIComponent(query)}&post_type=anime`
  const res = await fetch(url)
  const html = await res.text()
  const $ = cheerio.load(html)

  const results = []

  $("ul.chivsrc li").each((i, el) => {
    const title = $(el).find("h2 a").text().trim()
    const link = $(el).find("h2 a").attr("href")
    const thumb = $(el).find("img").attr("src")
    const status = $(el).find(".set").filter((i, e) => $(e).text().includes("Status")).text().replace("Status :", "").trim()
    const rating = $(el).find(".set").filter((i, e) => $(e).text().includes("Rating")).text().replace("Rating :", "").trim()
    const genres = $(el).find(".set a[href*='/genres/']").map((i, e) => $(e).text()).get().join(", ")

    if (title) results.push({ title, link, thumb, status, rating, genres })
  })

  return results
}

/* usage */

export default {
    route: {
        method: "get",
        path: "/search/otakudesu",
        auth: false,
        tags: ["Search"],
        summary: "otakudesu",
        description: "Search anime with otakudesu",
        parameters: [
            {
                name: "query",
                in: "query",
                required: true,
                description: "Kata kunci pencarian",
                schema: { type: "string" },
            },
        ],
        responses: {
            "200": {
                description: "Berhasil",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean", example: true },
                                result: { type: "object" },
                            },
                        },
                    },
                },
            },
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
            const result = await searchOtakuDesu(String(query).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

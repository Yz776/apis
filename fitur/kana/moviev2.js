// Auto-generated from r2-kana.vercel.app snippet "moviev2.js" (gW8l652)
// Source: https://r2-kana.vercel.app/#/snippet/gW8l652
// Description: Search You favorite movie

import * as cheerio from 'cheerio'
import fetch from 'node-fetch'

async function moviev2(query) {
  const res = await fetch(`https://cinesubz.net/?s=${encodeURIComponent(query)}`)
  const html = await res.text()
  const $ = cheerio.load(html)

  const results = []

  $('.display-item').each((i, el) => {
    results.push({
      title: $(el).find('h3').text().trim() || 'N/A',
      link: $(el).find('a').attr('href') || 'N/A',
      thumb: $(el).find('img').attr('src') || 'N/A',
      rating: $(el).find('.imdb-score').text().trim() || 'N/A',
      quality: $(el).find('.badge-quality-corner').text().trim() || 'N/A',
    })
  })

  return results
}
// usage

export default {
    route: {
        method: "get",
        path: "/kana/moviev2",
        auth: false,
        tags: ["Kana · Search"],
        summary: "moviev2",
        description: "Search You favorite movie",
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
            const result = await moviev2(String(query).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

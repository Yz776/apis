// Auto-generated from r2-kana.vercel.app snippet "search anime movie.js" (A2C8yIx)
// Source: https://r2-kana.vercel.app/#/snippet/A2C8yIx
// Description: Search Anime Favorit

/*
anidb.net search movie anime
Author: math
Base anidb.net 
Note: jangan lupa follow, lumayan lengkap result nya ⭐
Req from: mda
*/

import * as cheerio from 'cheerio'
import axios from 'axios'

const sleep = ms => new Promise(r => setTimeout(r, ms))

const searchAnidb = async (query, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const { data } = await axios.get(`https://anidb.net/anime/?adb.search=${encodeURIComponent(query)}&do.search=1`, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/91.0.4472.77 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      })

      const $ = cheerio.load(data)
      const results = []

      $('#animelist tbody tr').each((_, row) => {
        const $row = $(row)
        const id = $row.attr('id')?.replace('a', '')
        const title = $row.find('td.name a').first().text().trim()
        const url = 'https://anidb.net' + $row.find('td.name a').attr('href')
        const type = $row.find('td.type').text().trim()
        const eps = $row.find('td.eps').text().trim()
        const rating = $row.find('td.rating.weighted').text().trim()
        const aired = $row.find('td.airdate').text().trim()
        const ended = $row.find('td.enddate').text().trim()
        const thumb = $row.find('img').attr('src') || null
        if (title) results.push({ id, title, url, type, eps, rating, aired, ended, thumb })
      })

      return results
    } catch (e) {
      if (i < retries - 1) await sleep(2000 * (i + 1))
      else throw e
    }
  }
}
// Usage

export default {
    route: {
        method: "get",
        path: "/kana/search-anime-movie",
        auth: false,
        tags: ["Kana · Search"],
        summary: "search anime movie",
        description: "Search Anime Favorit",
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
            const result = await searchAnidb(String(query).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

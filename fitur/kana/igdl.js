// Auto-generated from r2-kana.vercel.app snippet "igdl.js" (O7SVC6Q)
// Source: https://r2-kana.vercel.app/#/snippet/O7SVC6Q
// Description: New code - igdl.js

/**
 * [ igdl Scraper ]
 *  Base: https://kol.id
 *  Noted: follow ch 
 *  Source Code: https://gist.github.com/nathwolf-123/221a0e0b2c2f7ffdd22d9b9bb7c480ed
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const base_url = 'https://kol.id'
const page_url = '/download-video/instagram'

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'

async function getTokenAndCookies() {
  const res = await axios.get(base_url + page_url, {
    headers: { 'user-agent': UA, 'accept-language': 'id-ID,id;q=0.9' },
  })

  const match = res.data.match(/_token:\s*['"]([^'"]+)['"]/)
  const token = match?.[1]

  const rawCookies = res.headers['set-cookie'] ?? []
  const cookieStr = rawCookies.map(c => c.split(';')[0]).join('; ')

  return { token, cookieStr }
}

async function igdl(igUrl) {
  const { token, cookieStr } = await getTokenAndCookies()

  if (!token) throw new Error('Token not found on page')

  const res = await axios.post(
    base_url + page_url,
    new URLSearchParams({ url: igUrl, _token: token }).toString(),
    {
      headers: {
        'user-agent': UA,
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'accept': '*/*',
        'origin': base_url,
        'referer': base_url + page_url,
        'x-requested-with': 'XMLHttpRequest',
        'cookie': cookieStr,
      },
    }
  )

  const html = res.data?.html ?? res.data
  const $ = cheerio.load(html)

  const links = []

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (href && (href.includes('cdninstagram') || href.includes('scontent') || href.includes('.mp4'))) {
      links.push({ label: $(el).text().trim() || 'video', url: href })
    }
  })

  if (links.length === 0) {
    const matches = html.match(/https:\/\/scontent[^\s"'<>&]+\.mp4[^\s"'<>]*/g) ?? []
    matches.forEach(url => links.push({ label: 'video', url }))
  }

  return { status: 200, links: links };
}

const result = await igdl("https://www.instagram.com/reel/DTSmpArgKSf/?igsh=MWhzOTgwMG1sZG4zeQ==")

console.log(result)

export default {
    route: {
        method: "get",
        path: "/kana/igdl",
        auth: false,
        tags: ["Downloader"],
        summary: "igdl",
        description: "New code - igdl.js",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL media yang akan diunduh",
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
        const { url } = req.query
        if (!url || !String(url).trim()) {
            return res.status(400).json({ ok: false, error: `url wajib diisi` })
        }
        try {
            const result = await igdl(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

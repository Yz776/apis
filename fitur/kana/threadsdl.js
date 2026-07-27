// Auto-generated from r2-kana.vercel.app snippet "threadsdl.js" (ow271eE)
// Source: https://r2-kana.vercel.app/#/snippet/ow271eE
// Description: New code - threadsdl.js

/**
 * [ *threadsdl Scraper* ]
 *  Creator: nath
 *  Noted: follow ch, Selebihnya atur sendiri
 *  Source Code: https://gist.github.com/nathwolf-123/6f9a7875511509705c6eeefef8362a20
 */

import { load } from 'cheerio';

async function _down(threadUrl) {
  const res = await fetch('https://savethr.com/process', {
    method: 'POST',
    headers: {
      'authority': 'savethr.com',
      'accept': '*/*',
      'content-type': 'application/x-www-form-urlencoded',
      'hx-current-url': 'https://savethr.com/id',
      'hx-request': 'true',
      'hx-target': 'result-container',
      'hx-trigger': 'search-form',
      'origin': 'https://savethr.com',
      'referer': 'https://savethr.com/id',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    },
    body: new URLSearchParams({ id: threadUrl, locale: 'id' }).toString(),
  });

  const html = await res.text();
  const $ = load(html);
  const result = [];

  $('.download_link').each((_, el) => {
    const href = $(el).attr('href');
    const label = $(el).text().trim();
    if (href) result.push({ url: href, label });
  });

  return {
    status: res.status,
    host: 'savethr.com',
    result,
   };
}


// ex

export default {
    route: {
        method: "get",
        path: "/kana/threadsdl",
        auth: false,
        tags: ["Kana · Downloader"],
        summary: "threadsdl",
        description: "New code - threadsdl.js",
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
            const result = await _down(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

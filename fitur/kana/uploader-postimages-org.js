// Auto-generated from r2-kana.vercel.app snippet "uploader postimages.org.js" (WBTsf9)
// Source: https://r2-kana.vercel.app/#/snippet/WBTsf9
// Description: Uploader all media

/*
uploader https://postimages.org
Author: nath
Base: https://postimages.org
Note: bisa delete klo gambarnya GK dipake, bantu follow ch 
*/

import fs from 'fs'
import * as cheerio from 'cheerio'

async function uploadPostImages(filePath) {
  const baseHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
  }

  const getRes = await fetch('https://postimages.org/', { headers: baseHeaders })
  const html = await getRes.text()

  const cookies = (getRes.headers.get('set-cookie') || '').replace(/;\s*(path=\/|HttpOnly|secure|SameSite=Lax)/gi, '')

  const tokenMatch = html.match(/name="token"\s+value="([^"]+)"/i)
  const token = tokenMatch ? tokenMatch[1] : ''

  const fileBuffer = fs.readFileSync(filePath)
  const blob = new Blob([fileBuffer], { type: 'image/jpeg' })

  const form = new FormData()
  form.append('token', token)
  form.append('upload_session', Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15))
  form.append('numfiles', '1')
  form.append('gallery', '')
  form.append('ui', '22')
  form.append('optsize', '0')
  form.append('expire', '0')
  form.append('cg', '1920x1080')
  form.append('file', blob, 'image.jpg')

  const postRes = await fetch('https://postimages.org/json', {
    method: 'POST',
    headers: {
      ...baseHeaders,
      'Accept': 'application/json',
      'Cookie': cookies,
      'Origin': 'https://postimages.org',
      'Referer': 'https://postimages.org/',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: form
  })

  const data = await postRes.json()

  if (data.url) {
    const pageRes = await fetch(data.url, { headers: baseHeaders })
    const pageHtml = await pageRes.text()
    const $ = cheerio.load(pageHtml)

    return {
      viewerUrl: data.url,
      directUrl: $('#direct').val() || $('meta[property="og:image"]').attr('content'),
      removeUrl: $('#remove').val()
    }
  }

  return data
}
// Ex
const res = await uploadPostImages('./test.jpg')
console.log(res)

export default {
    route: {
        method: "get",
        path: "/kana/uploader-postimagesorg",
        auth: false,
        tags: ["Kana · Tools"],
        summary: "uploader postimages.org",
        description: "Uploader all media",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL file yang akan diunggah ulang",
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
            const result = await uploadPostImages(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

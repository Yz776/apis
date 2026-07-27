// Auto-generated from r2-kana.vercel.app snippet "ufile.js" (dyrS9Og)
// Source: https://r2-kana.vercel.app/#/snippet/dyrS9Og
// Description: New code - ufile.js

/**
 * [ *ufile uploder Scraper* ]
 *  Creator: nath
 *  Noted: follow ch, Selebihnya atur sendiri
 *  Source Code: https://gist.github.com/nathwolf-123/b54f45ab1910e78d10e3390bfa1faaa5
 */

import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import path from 'path'

async function getCsrf() {
  const res = await axios.get('https://ufile.io', {
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36' }
  })
  const match = res.data.match(/id="csrf_hash"[^>]*value="([a-f0-9]+)"/)
  if (!match) throw new Error('CSRF not found')
  const csrf = match[1]
  const cookies = res.headers['set-cookie'] || []
  const cookieParts = cookies.map(c => c.split(';')[0])
  const cookieStr = cookieParts.join('; ')
  const sessionMatch = cookieStr.match(/_ci_sessions_=([^;]+)/)
  const sessionId = sessionMatch ? sessionMatch[1] : ''
  const cookie = `csrf_cookie_name=${csrf}; ${cookieStr}`
  return { csrf, cookie, sessionId }
}

async function upload(filePath) {
  const fileName = path.basename(filePath)
  const fileBuffer = fs.readFileSync(filePath)
  const fileSize = fs.statSync(filePath).size
  const fileExt = path.extname(filePath).replace('.', '')

  const { csrf, cookie, sessionId } = await getCsrf()

  const baseHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': '*/*',
    'Origin': 'https://ufile.io',
    'Referer': 'https://ufile.io/',
    'Cookie': cookie,
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
  }

  const storageRes = await axios.post('https://ufile.io/v1/upload/select_storage',
    `csrf_test_name=${csrf}`, { headers: baseHeaders }
  )
  const storageBaseUrl = storageRes.data.storageBaseUrl

  const sessionRes = await axios.post(`${storageBaseUrl}v1/upload/create_session`,
    `csrf_test_name=${csrf}&file_size=${fileSize}`,
    { headers: { ...baseHeaders, 'X-Requested-With': undefined } }
  )
  const fuid = sessionRes.data.fuid

  const form = new FormData()
  form.append('chunk_index', '1')
  form.append('fuid', fuid)
  form.append('file', fileBuffer, { filename: fileName, contentType: 'application/octet-stream' })

  await axios.post(`${storageBaseUrl}v1/upload/chunk`, form, {
    headers: {
      ...form.getHeaders(),
      'Cookie': cookie,
      'Origin': 'https://ufile.io',
      'Referer': 'https://ufile.io/',
      'User-Agent': baseHeaders['User-Agent']
    }
  })

  const finalRes = await axios.post(`${storageBaseUrl}v1/upload/finalise`,
    `csrf_test_name=${csrf}&fuid=${fuid}&file_name=${fileName}&file_type=${fileExt}&total_chunks=1&session_id=${sessionId}`,
    { headers: { ...baseHeaders, 'X-Requested-With': undefined } }
  )

  const data = finalRes.data

  return {
    status: 200,
    host: 'ufile.io',
    result: {
      id: data.id,
      url: data.url,
      filename: data.filename,
      size: data.size,
      type: data.type,
      expiry: data.expiry
    }
  }
}

export default {
    route: {
        method: "get",
        path: "/tools/ufile",
        auth: false,
        tags: ["Tools"],
        summary: "ufile",
        description: "New code - ufile.js",
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
            const result = await upload(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

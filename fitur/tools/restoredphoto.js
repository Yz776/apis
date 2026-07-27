// Auto-generated from r2-kana.vercel.app snippet "RestoredPhoto.js" (jpQFLt)
// Source: https://r2-kana.vercel.app/#/snippet/jpQFLt
// Description: New code - RestoredPhoto.js

/*
Restore Photo
Author: nath
Base: https://www.photorestore[DOT]io
Note: lumayan fast result nya
*/

import fs from 'fs'

async function restorePhoto(imagePath, scale = 2) {
  const base64 = fs.readFileSync(imagePath).toString('base64')
  const ext = imagePath.split('.').pop().toLowerCase()
  const dataUrl = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${base64}`

  const res = await fetch('https://us-central1-ai-apps-prod.cloudfunctions.net/restorePhoto', {
    method: 'POST',
    headers: {
      'accept': '*/*',
      'content-type': 'application/json',
      'origin': 'https://www.photorestore.io',
      'referer': 'https://www.photorestore.io/',
      'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
    },
    body: JSON.stringify({
      model: '9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3',
      version: 'v1.4',
      scale,
      img: dataUrl
    })
  })

  return await res.text()
}

export default {
    route: {
        method: "get",
        path: "/tools/restoredphoto",
        auth: false,
        tags: ["Tools"],
        summary: "RestoredPhoto",
        description: "New code - RestoredPhoto.js",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL gambar/video yang akan diproses",
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
            const result = await restorePhoto(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

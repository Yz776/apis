// Auto-generated from r2-kana.vercel.app snippet "img2toPrompt.js" (DXKJAO)
// Source: https://r2-kana.vercel.app/#/snippet/DXKJAO
// Description: convert image to prompt

/*
img2toPrompt
Author: nath
Base: https://generateprompt.ai
Note: follow the channel to reach 50 followers 
Req from: -
Sumber: https://whatsapp.com/channel/0029VbC5OZT7T8bXkKXY2d30
*/




import axios from 'axios'
import fs from 'fs'
const img2toPrompt = async (base64Image, feature = 'image-to-prompt-en', language = 'en') => {
  const r = await axios.post(
    'https://wabpfqsvdkdjpjjkbnok.supabase.co/functions/v1/unified-prompt-dev',
    { feature, language, image: base64Image },
    {
      responseType: 'stream',
      headers: {
        'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYnBmcXN2ZGtkanBqamtibm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczNjk5MjEsImV4cCI6MjA1Mjk0NTkyMX0.wGGq1SWLIRELdrntLntBz-QH-JxoHUdz8Gq-0ha-4a4',
        'content-type': 'application/json',
        'origin': 'https://generateprompt.ai',
        'referer': 'https://generateprompt.ai/',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
      }
    }
  )

  return new Promise((resolve, reject) => {
    let result = ''
    let buffer = ''

    r.data.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() 

      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const raw = line.slice(5).trim()
        try {
          const json = JSON.parse(raw)

          const text = json?.choices?.[0]?.delta?.content || json?.content || json?.text || null
          result += text
        } catch {}
      }
    })

    r.data.on('end', () => resolve(result.trim()))
    r.data.on('error', reject)
  })
}

// usage

export default {
    route: {
        method: "get",
        path: "/kana/img2toprompt",
        auth: false,
        tags: ["Tools"],
        summary: "img2toPrompt",
        description: "convert image to prompt",
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
            const result = await img2toPrompt(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

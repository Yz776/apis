// Auto-generated from r2-kana.vercel.app snippet "photoihancer.js" (RQGL4y)
// Source: https://r2-kana.vercel.app/#/snippet/RQGL4y
// Description: Jangan lupa follow ch
// PATCHED: convert non-JPEG images (PNG/WEBP/GIF) to JPEG via @napi-rs/canvas
// because ihancer.com only accepts JPEG input. Without conversion, returns 500.

/**
 * @credit: ren-offc
 * @noted: don't delete the credit
 */
import { loadImage, createCanvas } from '@napi-rs/canvas'

function detectImageMime(buf) {
  if (buf.length < 4) return 'application/octet-stream'
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png'
  // GIF: 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif'
  // WEBP: RIFF ... WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp'
  return 'application/octet-stream'
}

async function ensureJpegBuffer(buf) {
  const mime = detectImageMime(buf)
  if (mime === 'image/jpeg') return buf
  if (mime === 'application/octet-stream') {
    throw new Error('Format gambar tidak dikenali. Support: JPEG, PNG, WEBP, GIF.')
  }
  // Convert PNG/WEBP/GIF to JPEG via @napi-rs/canvas
  const img = await loadImage(buf)
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  // White background (JPEG doesn't support transparency)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, img.width, img.height)
  ctx.drawImage(img, 0, 0)
  return canvas.toBuffer('image/jpeg', 90)
}

async function photoihancer(imageUrl, method = 1) {
  if (!/^https?:\/\//i.test(imageUrl)) {
    throw new Error('URL tidak valid — harus diawali http:// atau https://')
  }
  const imgRes = await fetch(imageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36' }
  })
  if (!imgRes.ok) throw new Error(`Gagal unduh gambar (HTTP ${imgRes.status})`)
  const rawBuffer = Buffer.from(await imgRes.arrayBuffer())
  const jpegBuffer = await ensureJpegBuffer(rawBuffer)
  const blob = new Blob([jpegBuffer], { type: 'image/jpeg' })

  const form = new FormData()
  form.set('method', String(method))
  form.set('is_pro_version', 'true')
  form.set('is_enhancing_more', 'false')
  form.set('max_image_size', 'high')
  form.set('file', blob, 'file.jpg')

  const res = await fetch('https://ihancer.com/api/enhance', {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
      'Referer': 'https://ihancer.com/app/',
    },
    body: form,
  });

  if (!res.ok) throw new Error(`ihancer HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  return Buffer.from(await res.arrayBuffer());
}

export default {
    route: {
        method: "get",
        path: "/tools/photoihancer",
        auth: false,
        tags: ["Tools"],
        summary: "photoihancer",
        description: "Jangan lupa follow ch",
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
            const result = await photoihancer(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

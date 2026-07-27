// Auto-generated from r2-kana.vercel.app snippet "colorizer.js" (aweIMQ)
// Source: https://r2-kana.vercel.app/#/snippet/aweIMQ
// Description: New code - colorizer.js

/*
 * coloring image
 * Author: nath
 * Base: live3d.io
 * Note: selebihnya atur sendiri, follow ch
 */

import crypto from 'crypto'
import CryptoJS from 'crypto-js'
import fs from 'node:fs'

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwlO+boC6cwRo3UfXVBadaYwcX
0zKS2fuVNY2qZ0dgwb1NJ+/Q9FeAosL4ONiosD71on3PVYqRUlL5045mvH2K9i8b
AFVMEip7E6RMK6tKAAif7xzZrXnP1GZ5Rijtqdgwh+YmzTo39cuBCsZqK9oEoeQ3
r/myG9S+9cR5huTuFQIDAQAB
-----END PUBLIC KEY-----`

const APP_ID = "aifaceswap"
const U_ID = "1H5tRtzsBkqXcaJ"

const generateRandomString = (len) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const aesenc = (data, key) => {
  const k = CryptoJS.enc.Utf8.parse(key)
  return CryptoJS.AES.encrypt(data, k, { iv: k, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).toString()
}

const rsaenc = (data) => crypto.publicEncrypt(
  { key: PUBLIC_KEY, padding: crypto.constants.RSA_PKCS1_PADDING },
  Buffer.from(data, 'utf8')
).toString('base64')

const gencryptoheaders = (type, fp = null) => {
  const n = Math.floor(Date.now() / 1000)
  const r = crypto.randomUUID()
  const i = generateRandomString(16)
  const fingerPrint = fp || crypto.randomBytes(16).toString('hex')
  const s = rsaenc(i)
  const signStr = type === 'upload' ? `${APP_ID}:${r}:${s}` : `${APP_ID}:${U_ID}:${n}:${r}:${s}`
  return {
    'fp': fingerPrint,
    'fp1': aesenc(`${APP_ID}:${fingerPrint}`, i),
    'x-guide': s,
    'x-sign': aesenc(signStr, i),
    'x-code': Date.now().toString()
  }
}

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'origin': 'https://live3d.io',
  'referer': 'https://live3d.io/',
  'theme-version': '83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q'
}

const uploadImage = async (imagePath) => {
  const cryptoHeaders = gencryptoheaders('upload')
  const form = new FormData()
  const blob = new Blob([fs.readFileSync(imagePath)], { type: 'image/jpeg' })
  form.append('file', blob, 'image.jpg')
  const res = await fetch('https://app.live3d.io/aitools/upload-img', {
    method: 'POST',
    headers: { ...BASE_HEADERS, ...cryptoHeaders },
    body: form
  })
  const data = await res.json()
  console.log('res', JSON.stringify(data))
  return { path: data.data.path, fp: cryptoHeaders.fp }
}

const createJob = async (sourcePath, prompt = '(masterpiece), best quality', fp) => {
  const cryptoHeaders = gencryptoheaders('create', fp)
  const res = await fetch('https://app.live3d.io/aitools/of/create', {
    method: 'POST',
    headers: { ...BASE_HEADERS, 'Content-Type': 'application/json', ...cryptoHeaders },
    body: JSON.stringify({
      fn_name: 'demo-auto-coloring',
      call_type: 3,
      input: { source_image: sourcePath, prompt, lora: [], request_from: 9 },
      data: '',
      request_from: 9,
      origin_from: '8f3f0c7387123ae0'
    })
  })
  const data = await res.json()
  return data.data.task_id
}

const cekjob = async (taskId, fp) => {
  const cryptoHeaders = gencryptoheaders('check', fp)
  const res = await fetch('https://app.live3d.io/aitools/of/check-status', {
    method: 'POST',
    headers: { ...BASE_HEADERS, 'Content-Type': 'application/json', ...cryptoHeaders },
    body: JSON.stringify({ task_id: taskId, fn_name: 'demo-auto-coloring', call_type: 3, request_from: 9, origin_from: '8f3f0c7387123ae0' })
  })
  const data = await res.json()
  return data.data
}

const autoColor = async (imagePath, prompt = '(masterpiece), best quality') => {
  const { path, fp } = await uploadImage(imagePath)
  const taskId = await createJob(path, prompt, fp)

  let result
  do {
    await new Promise(r => setTimeout(r, 4000))
    result = await cekjob(taskId, fp)
  } while (result.status !== 2)

  return 'https://temp.live3d.io/' + result.result_image
}

export default {
    route: {
        method: "get",
        path: "/kana/colorizer",
        auth: false,
        tags: ["Kana · Tools"],
        summary: "colorizer",
        description: "New code - colorizer.js",
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
            const result = await autoColor(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

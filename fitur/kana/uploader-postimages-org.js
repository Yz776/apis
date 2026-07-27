// Auto-generated from r2-kana.vercel.app snippet "uploader postimages.org.js" (WBTsf9)
// Source: https://r2-kana.vercel.app/#/snippet/WBTsf9
// Description: Uploader all media
//
// Modified: original snippet read from local file (./test.jpg); for the REST
// API we fetch the image buffer from a URL parameter first.

/*
uploader https://postimages.org
Author: nath
Base: https://postimages.org
Note: bisa delete klo gambarnya GK dipake, bantu follow ch
*/

import * as cheerio from "cheerio"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"

async function uploadPostImages(imageUrl) {
  const baseHeaders = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  }

  const getRes = await fetch("https://postimages.org/", { headers: baseHeaders })
  const html = await getRes.text()

  const cookies = (getRes.headers.get("set-cookie") || "").replace(/;\s*(path=\/|HttpOnly|secure|SameSite=Lax)/gi, "")

  const tokenMatch = html.match(/name="token"\s+value="([^"]+)"/i)
  const token = tokenMatch ? tokenMatch[1] : ""

  // Fetch image from URL into a buffer (instead of reading local file)
  // Note: we use axios with rejectUnauthorized:false because Bun's native
  // fetch sometimes fails SSL verification on certain hosts.
  const imgRes = await fetch(imageUrl, {
    headers: { "User-Agent": UA },
  }).catch(async () => {
    // Fallback: use axios with relaxed TLS
    const axios = (await import("axios")).default
    const https = await import("node:https")
    const r = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      headers: { "User-Agent": UA },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    })
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      headers: { get: (k) => r.headers[k.toLowerCase()] || null },
      arrayBuffer: async () => r.data,
    }
  })
  if (!imgRes.ok) throw new Error(`Gagal fetch image dari URL: HTTP ${imgRes.status}`)
  const fileBuffer = Buffer.from(await imgRes.arrayBuffer())
  const contentType = imgRes.headers.get("content-type") || "image/jpeg"
  const blob = new Blob([fileBuffer], { type: contentType })

  const form = new FormData()
  form.append("token", token)
  form.append("upload_session", Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15))
  form.append("numfiles", "1")
  form.append("gallery", "")
  form.append("ui", "22")
  form.append("optsize", "0")
  form.append("expire", "0")
  form.append("cg", "1920x1080")
  form.append("file", blob, "image.jpg")

  const postRes = await fetch("https://postimages.org/json", {
    method: "POST",
    headers: {
      ...baseHeaders,
      "Accept": "application/json",
      "Cookie": cookies,
      "Origin": "https://postimages.org",
      "Referer": "https://postimages.org/",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: form,
  })

  const data = await postRes.json()

  if (data.url) {
    const pageRes = await fetch(data.url, { headers: baseHeaders })
    const pageHtml = await pageRes.text()
    const $ = cheerio.load(pageHtml)

    return {
      viewerUrl: data.url,
      directUrl: $("#direct").val() || $("meta[property=\"og:image\"]").attr("content"),
      removeUrl: $("#remove").val(),
    }
  }

  return data
}

export default {
    route: {
        method: "get",
        path: "/kana/uploader-postimagesorg",
        auth: false,
        tags: ["Tools"],
        summary: "Uploader (postimages.org) — alias",
        description: "Re-upload gambar dari URL ke postimages.org. Alias endpoint untuk uploader.js.",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL gambar yang akan diunggah ulang",
                schema: { type: "string", example: "https://example.com/image.jpg" },
            },
        ],
        responses: {
            "200": { description: "Berhasil" },
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

// /tools/uploader — re-upload a file from URL to uguu.se (no login, fast, JSON).
// Rewritten 2026-09-12: the previous postimages.org backend went behind a
// JS/Cloudflare challenge and can no longer be driven server-side, so this
// endpoint now uses uguu.se (returns JSON, keeps files ~3 hours).
import axios from "axios"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"

async function fetchBuffer(url) {
  // Try native fetch first; fall back to axios with relaxed TLS for hosts that
  // serve a hostname-mismatched certificate.
  try {
    const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(30000) })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return { buffer: Buffer.from(await r.arrayBuffer()), type: r.headers.get("content-type") || "application/octet-stream" }
  } catch {
    const https = await import("node:https")
    const r = await axios.get(url, {
      responseType: "arraybuffer",
      headers: { "user-agent": UA },
      timeout: 30000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    })
    return { buffer: Buffer.from(r.data), type: r.headers["content-type"] || "application/octet-stream" }
  }
}

export default {
  route: {
    method: "get",
    path: "/tools/uploader",
    auth: false,
    tags: ["Tools"],
    summary: "Upload file dari URL (uguu.se)",
    description:
      "Mengunduh file dari URL lalu mengunggahnya ulang ke uguu.se. Mengembalikan URL langsung, nama file, ukuran, dan link hapus. File tersimpan sementara (±3 jam).",
    parameters: [
      {
        name: "url",
        in: "query",
        required: true,
        description: "URL file/gambar yang akan diunggah ulang",
        schema: { type: "string", example: "https://picsum.photos/id/237/400/400.jpg" },
      },
    ],
    responses: {
      "200": { description: "Berhasil" },
      "400": { description: "Parameter tidak valid" },
      "500": { description: "Kesalahan server" },
    },
  },

  handler: async (req, res) => {
    const url = String(req.query.url || "").trim()
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ ok: false, error: "url wajib diisi dan harus http(s)://" })
    }
    try {
      const { buffer, type } = await fetchBuffer(url)
      const filename = url.split("/").pop().split("?")[0] || "upload.bin"

      const form = new FormData()
      form.append("files[]", new Blob([buffer], { type }), filename)

      const r = await fetch("https://uguu.se/upload", {
        method: "POST",
        headers: { "user-agent": UA },
        body: form,
        signal: AbortSignal.timeout(45000),
      })
      const data = await r.json().catch(() => null)
      if (!data || data.success !== true || !data.files?.[0]?.url) {
        throw new Error(`uguu.se menolak upload (HTTP ${r.status}): ${data?.errors || "no url"}`)
      }
      const f = data.files[0]
      res.json({
        ok: true,
        result: {
          provider: "uguu.se",
          url: f.url,
          filename: f.name || filename,
          size: f.size || buffer.length,
          mime: type,
          deletionUrl: f.deletion || null,
          deletionCode: f.deletion_code || null,
        },
      })
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || String(e) })
    }
  },
}

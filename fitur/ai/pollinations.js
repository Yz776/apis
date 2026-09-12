// /ai/pollinations — AI image generation via Pollinations (no API key).
// Added 2026-09-12. Note: Pollinations *text* API went paywalled (402 for real
// prompts); the *image* API (image.pollinations.ai, FLUX) is still free & fast,
// so this endpoint generates images. Returns a direct image URL.

import { URLSearchParams } from "url"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
const IMG_API = "https://image.pollinations.ai/prompt"

export default {
  route: {
    method: "get",
    path: "/ai/pollinations",
    auth: false,
    tags: ["AI"],
    summary: "AI Image Generator (Pollinations FLUX)",
    description:
      "Generate gambar dari teks memakai Pollinations (model FLUX) — gratis, tanpa API key. Kembalikan URL gambar langsung. Set `check=true` untuk memicu & memverifikasi render (default).",
    parameters: [
      { name: "prompt", in: "query", required: true, description: "Deskripsi gambar", schema: { type: "string", example: "seekor rubah merah di hutan, sinematik" } },
      { name: "width", in: "query", required: false, description: "Lebar (px)", schema: { type: "integer", default: 1024 } },
      { name: "height", in: "query", required: false, description: "Tinggi (px)", schema: { type: "integer", default: 1024 } },
      { name: "model", in: "query", required: false, description: "Model (flux, turbo)", schema: { type: "string", default: "flux" } },
      { name: "seed", in: "query", required: false, description: "Seed untuk hasil konsisten", schema: { type: "integer" } },
      { name: "check", in: "query", required: false, description: "true = render & validasi gambar dulu (default), false = kembalikan URL saja (instan)", schema: { type: "boolean", default: true } },
    ],
    responses: { "200": { description: "URL gambar berhasil" }, "400": { description: "Prompt kosong" }, "500": { description: "Server error" } },
  },

  handler: async (req, res) => {
    const prompt = String(req.query.prompt || "").trim()
    if (!prompt) return res.status(400).json({ ok: false, error: "prompt wajib diisi" })

    const width = Math.max(64, Math.min(2048, parseInt(req.query.width, 10) || 1024))
    const height = Math.max(64, Math.min(2048, parseInt(req.query.height, 10) || 1024))
    const model = /^[a-z]+$/i.test(String(req.query.model || "")) ? String(req.query.model).toLowerCase() : "flux"
    const seed = Number.isFinite(Number(req.query.seed)) ? String(req.query.seed) : undefined
    const check = req.query.check === "false" ? false : true

    const qs = new URLSearchParams({ width, height, model, nologo: "true", ...(seed && { seed }) })
    const imageUrl = `${IMG_API}/${encodeURIComponent(prompt)}?${qs}`

    if (!check) {
      return res.json({ ok: true, url: imageUrl, model, width, height, provider: "pollinations" })
    }

    try {
      const r = await fetch(imageUrl, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(90000) })
      if (!r.ok) throw new Error(`Pollinations HTTP ${r.status}`)
      const buf = Buffer.from(await r.arrayBuffer())
      const ct = r.headers.get("content-type") || ""
      if (!/^image\//i.test(ct) || buf.length < 1000) {
        throw new Error(`Response bukan gambar valid (ct=${ct}, bytes=${buf.length})`)
      }
      res.json({
        ok: true,
        url: imageUrl,
        provider: "pollinations",
        model,
        width,
        height,
        bytes: buf.length,
        content_type: ct,
      })
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || String(e), url: imageUrl })
    }
  },
}

// Auto-generated from r2-kana.vercel.app snippet "komiku.js" (MNgVD8h)
// Source: https://r2-kana.vercel.app/#/snippet/MNgVD8h
// Description: -

const _cfg = {
  base: 'https://komiku.org',
  api: 'https://api.komiku.org',
  ua: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36'
}

async function _req(url) {
  const r = await fetch(url, { headers: { 'User-Agent': _cfg.ua } })
  return r.text()
}

async function search_it(q) {
  const html = await _req(`${_cfg.api}/?s=${encodeURIComponent(q)}`)
  const results = []
  const seen = new Set()
  const pat = /href="\/([^"]*)-chapter-(\d+[\.\d]*)\/"/g
  let m
  while ((m = pat.exec(html)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1])
      results.push({ slug: m[1], chapter: m[2] })
    }
  }
  return results
}

async function manga_info(slug) {
  const html = await _req(`${_cfg.base}/manga/${slug}/`)
  const t = html.match(/<title>Komik ([^<]*) - Komiku<\/title>/)
  if (!t) return null
  const syn = html.match(/<div class="seriestucon">[\s\S]*?<p>([^<]*)<\/p>/)
  const img = html.match(/src="(https:\/\/img\.komiku\.org\/[^"]*\.(jpg|png|webp)[^"]*)"/)
  const type = html.match(/itemprop="additionalType" content="([^"]*)"/)?.[1] || ''
  const status = html.match(/itemprop="creativeWorkStatus" content="([^"]*)"/)?.[1] || ''
  const genres = [...html.matchAll(/itemprop="genre" content="([^"]*)"/g)].map(m => m[1])
  const author = html.match(/itemprop="name" content="([^"]*)"><\/span>\s*<\/span>\s*<span itemprop="publisher"/)?.[1] || ''
  const chs = []
  const ch = /href="\/([^"]*)-chapter-(\d+[\.\d]*)\/"/g
  let x
  while ((x = ch.exec(html)) !== null) {
    if (!chs.find(c => c.num === x[2])) chs.push({ num: x[2], url: `/${x[1]}-chapter-${x[2]}/` })
  }
  return { slug, title: t[1].trim(), type, status, genres, author, synopsis: syn?.[1]?.trim() || '', cover: img?.[1] || '', chapters: chs.slice(0, 15) }
}

async function chapter_imgs(slug, chap) {
  const html = await _req(`${_cfg.base}/${slug}-chapter-${chap}/`)
  const t = html.match(/<title>([^<]*)<\/title>/)
  const imgs = []
  const pat = /src="(https:\/\/img\.komiku\.org\/upload5\/[^"]*\.(jpg|png|webp)[^"]*)"/g
  let m
  while ((m = pat.exec(html)) !== null) {
    if (!imgs.includes(m[1])) imgs.push(m[1])
  }
  return { slug, chapter: chap, title: t?.[1] || '', images: imgs, total: imgs.length }
}

async function latest() {
  const html = await _req(_cfg.base)
  const items = []
  const pat = /href="\/([^"]*)-chapter-(\d+[\.\d]*)\/"/g
  let m
  while ((m = pat.exec(html)) !== null) {
    if (!items.find(i => i.slug === m[1])) {
      items.push({ slug: m[1], chapter: m[2] })
    }
  }
  return items.slice(0, 20)
}

export default {
    route: {
        method: "get",
        path: "/search/komiku",
        auth: false,
        tags: ["Search"],
        summary: "komiku",
        description: "-",
        parameters: [
            {
                name: "query",
                in: "query",
                required: true,
                description: "Kata kunci pencarian",
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
        const { query } = req.query
        if (!query || !String(query).trim()) {
            return res.status(400).json({ ok: false, error: `query wajib diisi` })
        }
        try {
            const result = await search_it(String(query).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

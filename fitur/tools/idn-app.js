// Auto-generated from r2-kana.vercel.app snippet "idn_app.js" (mIqEXq)
// Source: https://r2-kana.vercel.app/#/snippet/mIqEXq
// Description: Scraper idn app by ren

const _b = {
  api: 'https://api-gumlet.idn.app',
  web: 'https://www.idntimes.com',
};

const _ep = {
  search: (q) => `${_b.web}/search?q=${encodeURIComponent(q)}`,
  article: (s) => `${_b.web}/${s}`,
  home: () => `${_b.web}/`,
  category: (c) => `${_b.web}/${c}`,
  live_cat: () => `${_b.api}/api/v3/livestream/categories`,
  live_all: () => `${_b.api}/api/v4/livestreams`,
  live_one: (s) => `${_b.api}/api/v4/livestream/${s}`,
};

async function _get(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'okhttp/4.9.3',
      Accept: 'application/json',
    },
  });
  return res.json();
}

async function _scrape(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  return res.text();
}

function _extract(html) {
  const out = [];
  const matched = html.matchAll(/<h[23][^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gs);
  for (const m of matched) {
    const t = m[2].replace(/<[^>]+>/g, '').trim();
    const u = m[1].startsWith('http') ? m[1] : `${_b.web}${m[1]}`;
    if (t && t.length > 10 && !out.find(x => x.url === u))
      out.push({ title: t, url: u });
  }
  if (!out.length) {
    const fallback = html.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gs);
    for (const m of fallback) {
      const t = m[1].replace(/<[^>]+>/g, '').trim();
      if (t && t.length > 15) out.push({ title: t });
    }
  }
  return out;
}

async function search_it(q) {
  const html = await _scrape(_ep.search(q));
  return _extract(html);
}

async function get_live_cats() {
  const r = await _get(_ep.live_cat());
  return r.data || [];
}

async function get_streams() {
  const r = await _get(_ep.live_all());
  return r.data || [];
}

async function stream_detail(slug) {
  const r = await _get(_ep.live_one(slug));
  return r.data || null;
}

async function read_article(slug) {
  const u = slug.startsWith('http') ? slug : _ep.article(slug);
  const html = await _scrape(u);
  const res = { url: u, title: null, body: [] };

  const h1 = html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gs);
  for (const m of h1) {
    const t = m[1].replace(/<[^>]+>/g, '').trim();
    if (t && t.length > 10) { res.title = t; break; }
  }
  const paras = html.matchAll(/<p[^>]*>(.*?)<\/p>/gs);
  for (const m of paras) {
    const t = m[1].replace(/<[^>]+>/g, '').trim();
    if (t && t.length > 30) res.body.push(t);
  }
  return res;
}

async function get_news(cat = 'news/indonesia') {
  const path = cat === 'tekno' ? 'tech' : cat;
  const html = await _scrape(_ep.category(path));
  return _extract(html);
}

export default {
    route: {
        method: "get",
        path: "/tools/idnapp",
        auth: false,
        tags: ["Tools"],
        summary: "idn_app",
        description: "Scraper idn app by ren",
        parameters: [
            {
                name: "input",
                in: "query",
                required: true,
                description: "Parameter input",
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
        const { input, action } = req.query
        if (!input || !String(input).trim()) {
            return res.status(400).json({ ok: false, error: `input wajib diisi`, hint: `Kirim kata kunci pencarian artikel, contoh: ?input=naruto` })
        }
        try {
            // Default: cari artikel di idntimes.com berdasarkan query input.
            // Jika action=streams, kembalikan daftar livestream IDN Live.
            // Jika action=cats, kembalikan kategori livestream.
            let result
            const act = (action || 'search').trim().toLowerCase()
            if (act === 'streams') {
                result = await get_streams()
            } else if (act === 'cats') {
                result = await get_live_cats()
            } else if (act === 'article') {
                result = await read_article(String(input).trim())
            } else {
                result = await search_it(String(input).trim())
            }
            return res.json({ ok: true, action: act, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

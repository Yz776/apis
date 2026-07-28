// Auto-generated from r2-kana.vercel.app snippet "aiodl.js" (qItzAl)
// Source: https://r2-kana.vercel.app/#/snippet/qItzAl
// Description: New code - aiodl.js
// PATCHED: returns result instead of writing to disk; removed top-level call.

import * as cheerio from "cheerio";

async function aiodl(link) {
  const url = "https://savefbs.com/api/v1/aio/html";

  const config = {
    method: "POST",
    headers: {
      "accept": "*/*",
      "content-type": "application/json",
      "referer": "https://savefbs.com/all-in-one-video-downloader/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36"
    },
    body: JSON.stringify({
      vid: link,
      prefix: "savefbs.com",
      ex: "",
      format: ""
    })
  };

  const response = await fetch(url, config);
  const html = await response.text();
  const $ = cheerio.load(html);

  const title = $("h3.text-sm").text().trim();
  const thumb = $("img.aio-thumbnail").attr("src");
  const token = $(".aio-format-btn").first().attr("data-loader-id");

  const formats = [];
  $(".aio-format-btn").each((_, el) => {
    const onclick = $(el).attr("onclick");
    const match = onclick?.match(/'([^']+)'/);
    if (match) formats.push(match[1]);
  });

  return {
    title,
    thumb,
    token,
    formats: [...new Set(formats)]
  };
}

export default {
    route: {
        method: "get",
        path: "/downloader/aiodl",
        auth: false,
        tags: ["Downloader"],
        summary: "aiodl",
        description: "New code - aiodl.js",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL media (TikTok, Instagram, Facebook, dll.)",
                schema: { type: "string", example: "https://www.tiktok.com/@scout2015/video/6718335390845095173" },
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
            const result = await aiodl(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

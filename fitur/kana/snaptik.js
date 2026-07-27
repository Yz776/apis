// Auto-generated from r2-kana.vercel.app snippet "snaptik.js" (bcOdtAx)
// Source: https://r2-kana.vercel.app/#/snippet/bcOdtAx
// Description: New code - snaptik.js

/**
 * [ ✨ Scrape Snaptik Downloader Tiktok]
 *  Noted: Support quality 1080p
 *  Source Code: https://gist.github.com/nathwolf-123/d420207387323ec05fff50f7d9936be9
 */

import * as cheerio from "cheerio";

const tiktokUrl = "https://vt.tiktok.com/ZSHegaGC7/";
const base = "https://snaptik.net";

let sessionCookies = "";

const hdrs = () => ({
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0 Safari/537.36",
  Referer: base,
  Origin: base,
  ...(sessionCookies ? { Cookie: sessionCookies } : {}),
});

function saveCookies(res) {
  const raw = res.headers.getSetCookie?.() || [];
  if (raw.length) {
    sessionCookies = raw.map((c) => c.split(";")[0]).join("; ");
  }
}

async function getTokens() {
  const res = await fetch(`${base}/id`, { headers: hdrs() });
  saveCookies(res);

  const html = await res.text();
  const $ = cheerio.load(html);

  let k_lang, k_prefix_name;

  $("script").each((_, el) => {
    const src = $(el).html() || "";
    const m = (re) => {
      const r = src.match(re);
      return r ? r[1] : null;
    };
    k_lang ??= m(/k_lang\s*=\s*["']([^"']+)["']/);
    k_prefix_name ??= m(/k_prefix_name\s*=\s*["']([^"']+)["']/);
  });

  return {
    k_lang: k_lang || "id",
    k_prefix_name: k_prefix_name || "SnapTik.Net",
  };
}

async function searchVideo(url, tokens) {
  const body = new URLSearchParams({ q: url, lang: tokens.k_lang });
  const res = await fetch(`${base}/api/ajaxSearch`, {
    method: "POST",
    headers: {
      ...hdrs(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  saveCookies(res);

  const json = await res.json();
  if (json.status !== "ok") return;

  const $ = cheerio.load(json.data);

  const videoId = $("#TikTokId").val();
  const links = [];

  $(".tik-button-dl").each((_, el) => {
    const href = $(el).attr("href");
    const label = $(el).text().trim().toLowerCase();

    if (href) {
      let qualityLabel = "";
      if (label.includes("hd")) qualityLabel = "HD";
      else if (label.includes("mp3")) qualityLabel = "Audio";
      else if (label.includes("mp4")) qualityLabel = "Normal";

      if (qualityLabel !== "") {
        links.push({ quality: qualityLabel, link: href });
      }
    }
  });

  if (!links.length) throw new Error("failed result url");

  return { videoId, links };
}

async function main() {
  try {
    const tokens = await getTokens();
    const result = await searchVideo(tiktokUrl, tokens);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ error: error.message }, null, 2));
  }
}

export default {
    route: {
        method: "get",
        path: "/kana/snaptik",
        auth: false,
        tags: ["Downloader"],
        summary: "snaptik",
        description: "New code - snaptik.js",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL media yang akan diunduh",
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
            const result = await main(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

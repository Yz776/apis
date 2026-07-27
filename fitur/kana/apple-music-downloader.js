// Auto-generated from r2-kana.vercel.app snippet "Apple Music Downloader.js" (BjUhBH)
// Source: https://r2-kana.vercel.app/#/snippet/BjUhBH
// Description: New code - Apple Music Downloader.js

/**
 * [ ✨ Apple Music Downloader ]
 *  Base: https://aplmate.com
 *  Source Code: https://gist.github.com/nathwolf-123/634a43481cc9703fc18ee814fdcf2afe
 */

import makeFetchCookie from "fetch-cookie";
import * as cheerio from "cheerio";

const fetchw = makeFetchCookie(globalThis.fetch);

const BASE = "https://aplmate.com";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

async function solveTurnstile() {
  const res = await fetch("https://cf-solver-renofc.my.id/api/solvebeta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: BASE, siteKey: "0x4AAAAAACd16sFwAoNHGZqs", mode: "turnstile-min" })
  });
  const data = await res.json();
  if (!data?.token?.result?.token) throw new Error(JSON.stringify(data));
  return data.token.result.token;
}

async function aplmateDown(musicUrl) {
  await fetchw(BASE, { headers: { "User-Agent": UA } });

  const cfToken = await solveTurnstile();
  const form1 = new FormData();
  form1.append("url", musicUrl);
  form1.append("cf-turnstile-response", cfToken);

  const res1 = await fetchw(`${BASE}/action`, {
    method: "POST",
    headers: { "User-Agent": UA, "Origin": BASE, "Referer": `${BASE}/` },
    body: form1
  });

  const json1 = await res1.json();
  if (!json1.success || !json1.html) throw new Error(JSON.stringify(json1));

  const $ = cheerio.load(json1.html);
  const hiddenData  = $("input[name='data']").val();
  const hiddenBase  = $("input[name='base']").val();
  const hiddenToken = $("input[name='token']").val();

  await new Promise(r => setTimeout(r, 6000));

  const form2 = new FormData();
  form2.append("data", hiddenData);
  form2.append("base", hiddenBase);
  form2.append("token", hiddenToken);

  const res2 = await fetchw(`${BASE}/action/track`, {
    method: "POST",
    headers: { "User-Agent": UA, "Origin": BASE, "Referer": `${BASE}/` },
    body: form2
  });

  const json2 = await res2.json();
  const $2 = cheerio.load(json2.data);
  const links = [];
  $2("a.abutton").each((_, el) => {
    const href = $2(el).attr("href");
    const label = $2(el).text().trim();
    if (href && href.startsWith("/dl")) {
      links.push({ label, url: BASE + href });
    }
  });

  return { status: 200, result: links };
}

export default {
    route: {
        method: "get",
        path: "/kana/apple-music-downloader",
        auth: false,
        tags: ["Downloader"],
        summary: "Apple Music Downloader",
        description: "New code - Apple Music Downloader.js",
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
            const result = await solveTurnstile(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

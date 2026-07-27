// Auto-generated from r2-kana.vercel.app snippet "ytdown.js" (ySkYnJ)
// Source: https://r2-kana.vercel.app/#/snippet/ySkYnJ
// Description: New code - ytdown.js

/**
 * [ ✨ YouTube Downloader MP3 & MP4 HD ]
 *  Base: https://id.tunexa.io
 *  Noted: jangan lupa follow ch
 *  Source Code: https://gist.github.com/nathwolf-123/acd89ff18a972dbeff9b27928edac990
 */

import makeFetchCookie from "fetch-cookie";
import * as cheerio from "cheerio";

const fetchw = makeFetchCookie(globalThis.fetch);

const base_url = "https://id.tunexa.io";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

const hdrs = {
  "User-Agent": UA,
  "Origin": base_url,
  "Referer": `${base_url}/`,
  "X-Requested-With": "XMLHttpRequest"
};

async function solveTurnstile() {
  const res = await fetch("https://cf-solver-renofc.my.id/api/solvebeta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: base_url, siteKey: "0x4AAAAAACvMRVBY7pAdKlfv", mode: "turnstile-min" })
  });
  const data = await res.json();
  if (!data?.token?.result?.token) throw new Error("Solver gagal: " + JSON.stringify(data));
  return data.token.result.token;
}

async function getCsrfToken() {
  const res = await fetchw(base_url, { headers: { "User-Agent": UA } });
  const html = await res.text();
  const $ = cheerio.load(html);
  const token = $('meta[name="csrf-token"]').attr("content");
  if (!token) return;
  return token;
}

async function getFormats(videoUrl, csrfToken) {
  const res = await fetchw(`${base_url}/format-options`, {
    method: "POST",
    headers: { ...hdrs, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: new URLSearchParams({ video_url: videoUrl, _token: csrfToken })
  });
  return res.json();
}

export default {
    route: {
        method: "get",
        path: "/kana/ytdown",
        auth: false,
        tags: ["Downloader"],
        summary: "ytdown",
        description: "New code - ytdown.js",
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
            const result = await pollStatus(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

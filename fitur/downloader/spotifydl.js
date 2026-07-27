// Auto-generated from r2-kana.vercel.app snippet "spotifydl.js" (PY3lJl)
// Source: https://r2-kana.vercel.app/#/snippet/PY3lJl
// Description: Dowloader Spotify

/*
 Creator: nath
 Fitur: Spotify Downloader
 Base: j2download.com
 Install: npm install axios axios-cookiejar-support tough-cookie
 note: follow ygy
 */

import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

const BASE = "https://j2download.com";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36";

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

async function getTokens() {
  await client.get(BASE, {
    headers: {
      "user-agent": UA,
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  const cookies = await jar.getCookies(BASE);
  const apiToken = cookies.find(c => c.key === "api_token")?.value;
  const csrfToken = cookies.find(c => c.key === "csrf_token")?.value;

  if (!apiToken || !csrfToken) throw new Error("Gagal ambil token");

  return { apiToken, csrfToken };
}

async function spotifydl(url) {
  const { apiToken, csrfToken } = await getTokens();

  const res = await client.post(`${BASE}/api/autolink`, {
    data: { url, unlock: true },
  }, {
    headers: {
      "accept": "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "content-type": "application/json",
      "user-agent": UA,
      "origin": BASE,
      "referer": `${BASE}/`,
      "x-csrf-token": csrfToken,
      "cookie": `api_token=${apiToken}; csrf_token=${csrfToken}`,
    },
  });

  return res.data;
}

export default {
    route: {
        method: "get",
        path: "/downloader/spotifydl",
        auth: false,
        tags: ["Downloader"],
        summary: "spotifydl",
        description: "Dowloader Spotify",
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
            const result = await spotifydl(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

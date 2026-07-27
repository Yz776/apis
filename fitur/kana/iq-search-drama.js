// Auto-generated from r2-kana.vercel.app snippet "iq-search-drama.js" (ljRkIkX)
// Source: https://r2-kana.vercel.app/#/snippet/ljRkIkX
// Description: search drama with iq

/*
iq-search-drama 
Author: nath
Base https://iq.com
Note: sebenernya bisa, drama, film, anime, selebihnya atur sendiri,
Kalo Search Cantumkan Author nya
*/


import axios from "axios";
import * as cheerio from "cheerio";

const hdrs = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.iq.com/",
};

const typeOf = { 1: "Movie", 2: "Drama", 3: "Anime", 4: "Variety" };

async function searchIQ(query) {
  const res = await axios.get(`https://www.iq.com/search?query=${encodeURIComponent(query)}&originInput=Drama`, { headers: hdrs });
  const $ = cheerio.load(res.data);

  const raw = $("#__NEXT_DATA__").text();
  if (!raw) throw new Error("fail error");

  const parsed = JSON.parse(raw);
  const result = parsed?.props?.initialState?.search?.result;
  if (!result) throw new Error("gada hasilnya 🗿");

  const videos = (result.videos || []).slice(0, 15);

  return {
    data: videos.map(v => ({
      title: v.name?.replace(/<[^>]+>/g, "").trim(),
      year: v.publishYear || "",
      type: typeOf[v.chnId] || "Other",
      episodes: v.marks?.left_bottom?.text || "",
      rating: v.marks?.right_top?.num || "",
      url: "https:" + (v.albumUrl || v.url || ""),
    }))
  };
}

export default {
    route: {
        method: "get",
        path: "/kana/iq-search-drama",
        auth: false,
        tags: ["Kana · Search"],
        summary: "iq-search-drama",
        description: "search drama with iq",
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
            const result = await searchIQ(String(query).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

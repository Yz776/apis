// Auto-generated from r2-kana.vercel.app snippet "bmkg.js" (ihGzhdB)
// Source: https://r2-kana.vercel.app/#/snippet/ihGzhdB
// Description: biar tau suhu informasi cuaca di kotak kalian

/* Informasi BMKG
   😹👑biar kagak kedinginan wkwkw 
   by: vorx
   source: https://whatsapp.com/channel/0029Vb6P2e1E50UZYaX4wI0W
   tags: info, search
*/

const axios = require('axios');
const cheerio = require('cheerio');

function resolve(data, value, seen = new Set()) {
  if (typeof value === 'number') {
    if (seen.has(value)) return value;
    seen.add(value);
    return resolve(data, data[value], seen);
  }

  if (Array.isArray(value)) {
    return value.map(v => resolve(data, v, new Set(seen)));
  }

  if (value && typeof value === 'object') {
    const obj = {};

    for (const [k, v] of Object.entries(value)) {
      obj[k] = resolve(data, v, new Set(seen));
    }

    return obj;
  }

  return value;
}

async function bmkgWeather() {
  try {
    const { data: html } = await axios.get(
      'https://www.bmkg.go.id/',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
        }
      }
    );

    const $ = cheerio.load(html);

    const raw =
      $('#__NUXT_DATA__').html() ||
      $('script#__NUXT_DATA__').html();

    const nuxt = JSON.parse(raw);

    const root = nuxt.find(
      x =>
        x &&
        typeof x === 'object' &&
        typeof x.weather === 'number'
    );

    if (!root) {
      throw new Error('Weather data tidak ditemukan');
    }

    const weather = resolve(
      nuxt,
      nuxt[root.weather]
    );

    const result = (weather.present || [])
      .map(item => ({
        kodeWilayah: item.adm4,
        kota: item.nama,
        cuaca: item.weather_desc,
        waktu: item.local_datetime,
        zonaWaktu: item.time_zone,

        suhu:
          typeof item.t === 'number'
            ? item.t
            : null,

        kualitasUdara:
          typeof item.t === 'object'
            ? item.t.KONDISI || null
            : null
      }));

    return {
      status: true,
      total: result.length,
      data: result
    };

  } catch (e) {
    return {
      status: false,
      message: e.message
    };
  }
}

export default {
    route: {
        method: "get",
        path: "/kana/bmkg",
        auth: false,
        tags: ["Tools"],
        summary: "bmkg",
        description: "biar tau suhu informasi cuaca di kotak kalian",
        parameters: [],
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
        try {
            const result = await bmkgWeather()
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

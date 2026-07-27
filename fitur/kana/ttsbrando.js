// Auto-generated from r2-kana.vercel.app snippet "ttsBrando.js" (aDvj9PI)
// Source: https://r2-kana.vercel.app/#/snippet/aDvj9PI
// Description: Ambil cookie nya pake extension Cookie-editor

const ip_prefix = [1,2,5,23,27,31,36,37,39,42,46,49,50,60,114,117,118,119,120,121,122,123,124,125,126,180,182,183]

function randomIP() {
  const a = ip_prefix[Math.floor(Math.random() * ip_prefix.length)]
  const b = Math.floor(Math.random() * 256)
  const c = Math.floor(Math.random() * 256)
  const d = Math.floor(Math.random() * 256)
  return `${a}.${b}.${c}.${d}`
}

const ip = randomIP()

const config = {
  text: process.argv.slice(2)[0],
  voiceID: "RWiGLY9uXI70QL540WNd",
  useTurbo: false,
  outputFormat: "mp3_44100_128",
  speed: 1,
  stability: 0.7,
  similarityBoost: 0.75
};

async function ttsBrando() {
  try {
    const r = await fetch("https://easy-peasy.ai/api/generate-audio", {
      method: "POST",
      headers: {
        "authority": "easy-peasy.ai",
        "accept": "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/json",
        "cookie": "",
        "origin": "https://easy-peasy.ai",
        "pragma": "no-cache",
        "referer": "https://easy-peasy.ai/tts",
        "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
        "x-forwarded-for": ip,
        "x-real-ip": ip,
        "client-ip": ip,
        "true-client-ip": ip,
        "x-originating-ip": ip,
        "x-cluster-client-ip": ip,
        "forwarded": `for=${ip}`
      },
      body: JSON.stringify(config)
    });

   const data = await r.json();
   return { status: r.status, developer: "ren-offc", uuid: data.uuid, text: data.text, result: { url: data.url } };
  } catch (err) {
    console.error(err);
  }
}

export default {
    route: {
        method: "get",
        path: "/kana/ttsbrando",
        auth: false,
        tags: ["Tools"],
        summary: "ttsBrando",
        description: "Ambil cookie nya pake extension Cookie-editor",
        parameters: [
            {
                name: "text",
                in: "query",
                required: true,
                description: "Teks yang akan dijadikan suara",
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
        const { text } = req.query
        if (!text || !String(text).trim()) {
            return res.status(400).json({ ok: false, error: `text wajib diisi` })
        }
        try {
            const result = await ttsBrando(String(text).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

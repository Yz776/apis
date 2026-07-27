// Auto-generated from r2-kana.vercel.app snippet "deepsek ai.js" (JHUKGtT)
// Source: https://r2-kana.vercel.app/#/snippet/JHUKGtT
// Description: chat with ai deepsek

/*
Deepsek ai
Author: nath 
Base: https://deepseekfree.ai/
Note: Bantu push followers --> 50
Sumber: https://whatsapp.com/channel/0029VbC5OZT7T8bXkKXY2d30
*/




import { randomBytes } from "crypto";

const base = "https://api-preview.chatgot.io";

const hdrs = {
  "accept": "text/event-stream",
  "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "content-type": "application/json",
  "origin": "https://deepseekfree.ai",
  "referer": "https://deepseekfree.ai/",
  "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "cross-site",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
};

const randomDeviceId = () => randomBytes(16).toString("hex");

async function chat(message) {
  const res = await fetch(`${base}/api/v1/char-gpt/conversations`, {
    method : "POST",
    headers: hdrs,
    body   : JSON.stringify({
      device_id        : randomDeviceId(),
      model_id         : 2,
      include_reasoning: false,
      messages         : [{ role: "user", content: message }],
    }),
  });

  let data = "";
  const decoder = new TextDecoder();
  for await (const chunk of res.body) {
    const lines = decoder.decode(chunk).split("\n");
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      try {
        const json = JSON.parse(line.slice(5).trim());
        if (json?.data?.content) {
          process.stdout.write(json.data.content);
          data += json.data.content;
        }
      } catch {}
    }
  }

  console.log();
  return data;
}

export default {
    route: {
        method: "get",
        path: "/kana/deepsek-ai",
        auth: false,
        tags: ["Kana · AI"],
        summary: "deepsek ai",
        description: "chat with ai deepsek",
        parameters: [
            {
                name: "prompt",
                in: "query",
                required: true,
                description: "Pertanyaan / prompt untuk AI",
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
        const { prompt } = req.query
        if (!prompt || !String(prompt).trim()) {
            return res.status(400).json({ ok: false, error: `prompt wajib diisi` })
        }
        try {
            const result = await chat(String(prompt).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

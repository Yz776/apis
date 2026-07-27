// Auto-generated from r2-kana.vercel.app snippet "gpt-3.5.js" (yd24Tw6)
// Source: https://r2-kana.vercel.app/#/snippet/yd24Tw6
// Description: chat assisten gpt3

/*
skrep gpt-3.5
creator: nath
base: https://chatopenai.id
note: fix nonce issue Maret/05/2:22
*/

import fetch from "node-fetch";
import FormData from "form-data";

const client_id = () => Math.random().toString(36).slice(2, 12);

async function getNonce() {
  const res = await fetch("https://chatopenai.id/", {
    headers: {
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
      "accept-language": "id-ID,id;q=0.9",
    }
  });
  const html = await res.text();
  const match = html.match(/data-nonce="([^"]+)"/);
  if (!match) throw new Error("Nonce tidak ditemukan");
  return match[1];
}

async function chat(message, history = []) {
  const nonce = await getNonce();

  const form = new FormData();
  form.append("_wpnonce", nonce);
  form.append("post_id", "2");
  form.append("url", "https://chatopenai.id");
  form.append("action", "wpaicg_chat_shortcode_message");
  form.append("message", message);
  form.append("bot_id", "0");
  form.append("chatbot_identity", "shortcode");
  form.append("wpaicg_chat_client_id", client_id());
  form.append("wpaicg_chat_history", JSON.stringify(history));

  const res = await fetch("https://chatopenai.id/wp-admin/admin-ajax.php", {
    method: "POST",
    headers: {
      ...form.getHeaders(),
      "accept": "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      "origin": "https://chatopenai.id",
      "referer": "https://chatopenai.id/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
    },
    body: form,
  });

  const json = await res.json();
  if (json.status !== "success" || !json.data) throw new Error(JSON.stringify(json));
  return json.data;
}

export default {
    route: {
        method: "get",
        path: "/kana/gpt-35",
        auth: false,
        tags: ["AI"],
        summary: "gpt-3.5",
        description: "chat assisten gpt3",
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

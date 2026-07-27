// Auto-generated from r2-kana.vercel.app snippet "quillbotAi.js" (Z4Ga4OL)
// Source: https://r2-kana.vercel.app/#/snippet/Z4Ga4OL
// Description: quillbotAi Scraper

import crypto from 'node:crypto';

async function quillbotAi(input) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 30000);
  const traceid = crypto.randomBytes(8).toString('hex');
  const spanid = crypto.randomBytes(8).toString('hex');

  try {
    const res = await fetch(`https://quillbot.com/api/ai-chat/chat/conversation/${crypto.randomUUID()}`, {
      method: 'POST',
      signal: ctl.signal,
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
        useridtoken: 'empty-token',
        'webapp-version': '43.32.7',
        'platform-type': 'webapp',
        'qb-product': 'AI-CHAT',
        'sentry-trace': `${traceid}-${spanid}-0`,
        baggage: `sentry-environment=prod,sentry-release=v43.32.7,sentry-trace_id=${traceid}`,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        origin: 'https://quillbot.com',
        referer: 'https://quillbot.com/'
      },
      body: JSON.stringify({
        message: { content: input },
        context: {
          editorContext: '',
          selectionContext: '',
          userDialect: 'en-us',
          apiVersion: 2
        },
        origin: { name: 'ai-chat.chat', url: 'https://quillbot.com' }
      })
    });
    if (!res.ok) throw new Error(`${res.status}`);
    if (!res.body) throw new Error('stream empty');

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        const tail = buffer.trim();
        if (tail.startsWith('{')) {
          const obj = JSON.parse(tail);
          if (obj.type === 'content' && obj.content) fullContent += obj.content;
        }
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('{')) continue;
        const obj = JSON.parse(line);
        if (obj.type === 'content' && obj.content) fullContent += obj.content;
      }
    }

    return { status: res.status, developer: 'ren-offc', result: { answer: fullContent } };
  } finally {
    clearTimeout(to);
  }
}

export default {
    route: {
        method: "get",
        path: "/kana/quillbotai",
        auth: false,
        tags: ["AI"],
        summary: "quillbotAi",
        description: "quillbotAi Scraper",
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
            const result = await quillbotAi(String(prompt).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

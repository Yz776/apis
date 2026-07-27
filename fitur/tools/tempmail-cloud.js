// Auto-generated from r2-kana.vercel.app snippet "tempmail cloud.js" (KVtTOO)
// Source: https://r2-kana.vercel.app/#/snippet/KVtTOO
// Description: temp email

import axios from 'axios';

const BASE_URL = 'https://multi-tools.cloud';
const SESSION = 'd2f4mr5d7gmgmkom026ek9iqpk';

const headers = {
  'accept': '*/*',
  'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'x-requested-with': 'XMLHttpRequest',
  'referer': 'https://multi-tools.cloud/',
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  'cookie': `PHPSESSID=${SESSION}`,
};

const generateEmail = async () => {
  const res = await axios.get(`${BASE_URL}/?action=generate&_=${Date.now()}`, { headers });
  return res.data;
};

const saveEmail = async (email, uptime = '232', status = 'good') => {
  const res = await axios.post(
    `${BASE_URL}/?action=save_email&_=${Date.now()}`,
    { email, uptime, status },
    {
      headers: {
        ...headers,
        'content-type': 'application/json',
        'origin': 'https://multi-tools.cloud',
      }
    }
  );
  return res.data;
};

const getInbox = async (email) => {
  const res = await axios.get(
    `${BASE_URL}/?action=inbox&email=${encodeURIComponent(email)}&_=${Date.now()}`,
    { headers }
  );
  return res.data?.result?.inbox ?? [];
};

const waitForEmail = async (email, intervalMs = 3000, maxRetries = 20) => {
  for (let i = 0; i < maxRetries; i++) {
    const inbox = await getInbox(email);
    if (inbox && inbox.length > 0) {
      return inbox;
    }
    console.log(`[${i + 1}/${maxRetries}] Inbox empty, retry in ${intervalMs / 1000}s...`);
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('Timeout');
};

export default {
    route: {
        method: "get",
        path: "/tools/tempmail-cloud",
        auth: false,
        tags: ["Tools"],
        summary: "tempmail cloud",
        description: "temp email",
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
            const result = await waitForEmail()
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

// Auto-generated from r2-kana.vercel.app snippet "claude3.js" (Mh1jcpC)
// Source: https://r2-kana.vercel.app/#/snippet/Mh1jcpC
// Description: chat assisten with claude3

/*
Fitur: ai Claude 
type: -
Creator: nath
base: https://deepai.org/chat/claude-3-haiku
NOTE: Jan hapus wm hargai creator
*/


import axios from 'axios';

function generateApiKey() {
    const r = Math.floor(1e11 * Math.random());
    const n = "tryit-" + r + "-" + "a3edf17b505349f1794bcdbc7290a045";
    return n;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function askClaude(question) {
    try {
        console.log("Claudev1 (deepai)");

        const apiKey = generateApiKey();
        const sessionUuid = generateUUID();

        const formData = new FormData();
        formData.append('chat_style', 'claudeai_0');
        formData.append('chatHistory', JSON.stringify([
            { role: "user", content: question }
        ]));
        formData.append('model', 'standard');
        formData.append('session_uuid', sessionUuid);
        formData.append('hacker_is_stinky', 'very_stinky');

        const response = await axios.post("https://api.deepai.org/hacking_is_a_serious_crime", formData, {
            headers: {
                "api-key": apiKey,
                "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
                "referer": "https://deepai.org/chat/claude-3-haiku",
                "accept": "*/*"
            }
        });

        console.log(response.data);
        return response.data;

    } catch (err) {
    }
}

export default {
    route: {
        method: "get",
        path: "/kana/claude3",
        auth: false,
        tags: ["Kana · AI"],
        summary: "claude3",
        description: "chat assisten with claude3",
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
            const result = await askClaude(String(prompt).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

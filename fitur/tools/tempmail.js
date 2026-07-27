import axios from "axios"

const HEADERS = {
    'Content-Type': 'application/json',
    'Application-Name': 'web',
    'Application-Version': '4.0.0',
    'X-CORS-Header': 'iaWg3pchvFx48fY',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

async function createEmail() {
    const url = 'https://api.internal.temp-mail.io/api/v3/email/new'
    const payload = { min_name_length: 10, max_name_length: 10 }
    const response = await axios.post(url, payload, { headers: HEADERS })
    return response.data
}

async function checkInbox(email) {
    const url = `https://api.internal.temp-mail.io/api/v3/email/${email}/messages`
    const response = await axios.get(url, { headers: HEADERS })
    return response.data
}

export default {
    route: {
        method: "get",
        path: "/tools/tempmail",
        auth: false,
        tags: ["Tools"],
        summary: "Temp Mail - Email sementara",
        description:
            "Buat email sementara atau cek inbox email yang sudah dibuat. " +
            "Jika tanpa parameter, akan membuat email baru. " +
            "Jika parameter email diisi, akan mengecek inbox email tersebut.\n\n" +
            "**Contoh:**\n" +
            "```\nGET /tools/tempmail\nGET /tools/tempmail?email=abc123@domain.com\n```",
        parameters: [
            {
                name: "email",
                in: "query",
                required: false,
                description: "Alamat email sementara untuk mengecek inbox (kosongkan untuk membuat email baru)",
                schema: { type: "string" }
            }
        ],
        responses: {
            "200": {
                description: "OK",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean" },
                                result: { type: "object" }
                            }
                        }
                    }
                }
            },
            "400": {
                description: "Request tidak valid",
                content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } }
            },
            "500": {
                description: "Kesalahan server",
                content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, error: { type: "string" } } } } }
            }
        }
    },

    handler: async (req, res) => {
        const { email } = req.query
        try {
            if (!email) {
                // Buat email baru
                const account = await createEmail()
                if (!account) {
                    return res.status(500).json({ ok: false, error: "Gagal membuat email sementara" })
                }
                res.json({
                    ok: true,
                    result: {
                        state: "created",
                        email: account.email,
                        token: account.token
                    }
                })
            } else {
                // Cek inbox
                const messages = await checkInbox(email)
                const formatted = messages.map(msg => {
                    const otpMatch = msg.body_text ? msg.body_text.match(/\b\d{4,8}\b/) : null
                    return {
                        from: msg.from || "",
                        subject: msg.subject || "",
                        body: msg.body_text ? msg.body_text.replace(/\n/g, ' ').trim() : "",
                        otp: otpMatch ? otpMatch[0] : null
                    }
                })
                res.json({
                    ok: true,
                    result: {
                        state: "inbox",
                        email: email,
                        messages: formatted
                    }
                })
            }
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message })
        }
    }
}

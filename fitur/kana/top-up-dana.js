// Auto-generated from r2-kana.vercel.app snippet "top_up_dana.js" (hQi8Nh4)
// Source: https://r2-kana.vercel.app/#/snippet/hQi8Nh4
// Description: baca teks teks yang ada di kode nya supaya tidak salah 😠

/* Top Up Dana Scrape
   Karena Duit Aku Gak ada jadi belum di tes website nya work apa kagak, jadi tes nominal kecil dulu seribu 
   by: vorx
   source: https://whatsapp.com/channel/0029Vb6P2e1E50UZYaX4wI0W
   tags: tools, payment
*/

// top_up_dana.js by zx?

async function createTokogameOrder() {
  const url = 'https://api.tokogame.com/core/v1/orders/create-order';
  
  // Payload order (Top Up DANA Rp 1.000)
  const payload = {
    "contact": {
      "emailAddress": "",
      "phoneNumber": "+6283140961614" // nomor ini acakin aja gak guna tapi wajib di isi
    },
    "paymentMethod": "QRIS_ID_BNC",
    "productId": "67ca818d93cbad5184377578",
    "productPackageCode": "1000", // Kode paket Rp 1.000 / 10.000 tengok paket nya langsung ke https://www.tokogame.com
    "questionnaireAnswers": [
      {
        "questionnaire": {
          "code": "userid",
          "inputType": "NUMBER",
          "regexValidation": {
            "regex": "^08\\d{8,12}$",
            "errorMessages": [
              {
                "language": "ID",
                "title": "Format Nomor HP Salah",
                "body": "Format nomor HP salah. Mohon masukkan nomor yang dimulai dengan 08..."
              }
            ]
          },
          "translations": [
            {
              "language": "ID",
              "question": "Masukkan No. HP",
              "description": "Nomor HP",
              "choices": []
            }
          ]
        },
        "answer": "08***" // Nomor DANA tujuan yang ingin di top up, awali 08 bukan 628
      }
    ]
  };

  // Catatan: Beberapa header mungkin butuh di-generate ulang secara dinamis
  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'X-Language': 'ID',
    'X-Region': 'ID',
    'X-Currency': 'IDR',
    'X-Request-Id': '4e0a951b-30c6-4eff-9c3e-45d03dfe4801', // Idealnya generate UUID v4 baru setiap request
    'X-Secret-Id': '598e6d304472abccc24221ce958a2da148d82e9a98b0085b2a2a2d94f9f12dfc', 
    'X-App-Instance-Id': '670c4394466747d0a8ecd18fef703d44'
  };

  try {
    console.log('Mencoba membuat order...');
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (data.code === 'SUCCESS') {
      console.log('✅ Order Berhasil Dibuat!');
      console.log('Order ID:', data.data.id);
      console.log('Order Code:', data.data.code);
      console.log('Total Tagihan:', data.data.totalPriceInCents / 100, 'IDR');
      console.log('QRIS URL:', data.data.checkoutUrl.qrUrl);
      
      await checkOrderStatus(data.data.id, data.data.code, headers);
    } else {
      console.error('❌ Gagal membuat order:', data);
    }
  } catch (error) {
    console.error('Terjadi kesalahan network:', error);
  }
}

async function checkOrderStatus(orderId, orderCode, headers) {
  const url = `https://api.tokogame.com/core/v1/orders?id=${orderId}&code=${orderCode}`;
  
  const getHeaders = { ...headers };
  delete getHeaders['Content-Type'];

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders
    });

    const data = await response.json();
    console.log(`Status Pembayaran: ${data.data.paymentStatus}`);
    console.log(`Status Proses: ${data.data.processingStatus}`);
  } catch (error) {
    console.error('Gagal mengecek status:', error);
  }
}

// Jalankan sistem

export default {
    route: {
        method: "get",
        path: "/kana/topupdana",
        auth: false,
        tags: ["Tools"],
        summary: "top_up_dana",
        description: "baca teks teks yang ada di kode nya supaya tidak salah \ud83d\ude20",
        parameters: [
            {
                name: "input",
                in: "query",
                required: true,
                description: "Parameter input",
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
        const { input } = req.query
        if (!input || !String(input).trim()) {
            return res.status(400).json({ ok: false, error: `input wajib diisi` })
        }
        try {
            const result = await createTokogameOrder(String(input).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

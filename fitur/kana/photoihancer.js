// Auto-generated from r2-kana.vercel.app snippet "photoihancer.js" (RQGL4y)
// Source: https://r2-kana.vercel.app/#/snippet/RQGL4y
// Description: Jangan lupa follow ch

/**
 * @credit: ren-offc
 * @noted: don't delete the credit
 */
async function photoihancer(imagePath, method = 1) {
  const fs = await import('fs');

  const imageBuffer = fs.readFileSync(imagePath);
  const blob = new Blob([imageBuffer], { type: 'image/jpeg' });

  const form = new FormData();
  form.set('method', String(method));
  form.set('is_pro_version', 'true');
  form.set('is_enhancing_more', 'false');
  form.set('max_image_size', 'high');
  form.set('file', blob, 'file.jpg');

  const res = await fetch('https://ihancer.com/api/enhance', {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
      'Referer': 'https://ihancer.com/app/',
    },
    body: form,
  });

  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main(imagePath, outputPath, method = 1) {
  const fs = await import('fs');
  const result = await photoihancer(imagePath, method);
  fs.writeFileSync(outputPath, result);
}

export default {
    route: {
        method: "get",
        path: "/kana/photoihancer",
        auth: false,
        tags: ["Kana · Tools"],
        summary: "photoihancer",
        description: "Jangan lupa follow ch",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL gambar/video yang akan diproses",
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
        const { url } = req.query
        if (!url || !String(url).trim()) {
            return res.status(400).json({ ok: false, error: `url wajib diisi` })
        }
        try {
            const result = await photoihancer(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

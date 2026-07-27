// Auto-generated from r2-kana.vercel.app snippet "wan text to video.js" (R22B5y)
// Source: https://r2-kana.vercel.app/#/snippet/R22B5y
// Description: generate video

/*
 * wan 2.2 14B, text to video
 * Author: nath
 * Base: https://upsampler.com/free-video-generator-no-signup
 * Noted: ZeroGPU quota 60s/day
*/
import axios from "axios"
import fs from "node:fs"

const base = "https://luca115-wan2-2-fp8da-aoti.hf.space/gradio_api"
const session = Math.random().toString(36).slice(2)

async function WanVideo(prompt, duration = 5.1) {
  const r = await axios.post(`${base}/queue/join`, {
    data: [prompt, "色调艳丽, 过曝, 静态", duration, 1, 3, 4, 42, true],
    fn_index: 0,
    session_hash: session
  })

  const res = await axios.get(`${base}/queue/data?session_hash=${session}`, {
    responseType: "stream"
  })

  return new Promise((resolve, reject) => {
    let buffer = ""
    res.data.on("data", chunk => {
      buffer += chunk.toString()
      const lines = buffer.split("\n")
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith("data:")) continue
        try {
          const data = JSON.parse(line.slice(5))
          if (data.msg === "process_completed") resolve(data)
          if (data.msg === "queue_full") reject(new Error("Queue full"))
        } catch (_) {}
      }
    })
    res.data.on("error", reject)
    setTimeout(() => reject(new Error("timeout")), 300000)
  })
}

export default {
    route: {
        method: "get",
        path: "/kana/wan-text-to-video",
        auth: false,
        tags: ["Tools"],
        summary: "wan text to video",
        description: "generate video",
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
            const result = await WanVideo(String(input).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

// Auto-generated from r2-kana.vercel.app snippet "YouTube-Summary.js" (33UlbE)
// Source: https://r2-kana.vercel.app/#/snippet/33UlbE
// Description: New code - YouTube-Summary.js

/*
YouTube Summary
Author: nath
Base: https:[sles]notegpt[dot]io/youtube-video-summarizer
Note: atur sendiri selebihnya, bantu follow ch, maap jarang share skrep, admin sibuk di real-life 
Enjoy 
*/
const COOKIES = 'sbox-guid=MTc3Mzc5NzUzMXw3NjV8OTIxODUyMzg0; anonymous_user_id=aee32c94-c981-4ee2-95e9-40e606d4a68c; _ga=GA1.2.1580741056.1773797526'

function extractVideoId(input) {
  try {
    const url = new URL(input)
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1)
    return url.searchParams.get('v') || input
  } catch {
    return input
  }
}

async function youtubeSummary(videoUrl, lang = 'id-ID') {
  const videoId = extractVideoId(videoUrl)

  const transcriptRes = await fetch(`https://notegpt.io/api/v2/video-transcript?platform=youtube&video_id=${videoId}`, {
    headers: {
      'Accept': 'application/json',
      'Referer': 'https://notegpt.io/youtube-video-summarizer',
      'Origin': 'https://notegpt.io',
      'Cookie': COOKIES
    }
  })
  const transcriptData = await transcriptRes.json()
  if (transcriptData.code !== 100000) throw new Error(transcriptData.message)

  const videoInfo = transcriptData.data.videoInfo
  const transcripts = transcriptData.data.transcripts
  const langKey = Object.keys(transcripts)[0]
  const transcriptList = transcripts[langKey].custom || transcripts[langKey].default
  const transcriptText = transcriptList.map(t => `[${t.start} ~ ${t.end}] ${t.text}`).join('\n\n')

  const configRes = await fetch('https://notegpt.io/api/v1/ai-tab/get-prod-config', {
    headers: { 'Accept': 'application/json', 'Cookie': COOKIES }
  })
  const configData = await configRes.json()
  if (configData.code !== 100000) throw new Error('faild get config')
  const { t, nonce, sign, secret_key, uid, app_id } = configData.data

  await fetch(`https://notegpt.io/api/v1/model-config?business=summary&sign=${encodeURIComponent(sign)}&timestamp=${t}`, {
    headers: { 'Accept': 'application/json', 'Cookie': COOKIES }
  })

  const apiUrl = 'https://api.journeydraw.ai/chatgpt/v4/question'
  const prompt = `You are an **expert in summarizing video content**, skilled at extracting key information and generating **high-quality, well-structured summaries**.
Based on the provided Video Transcript, complete the following tasks:

**Task Description:**
Generate a professional, credible summary of the following content. The output must be strictly grounded in the source—no fabrication. Formatting: - Flexible structure: - Timeline table if chronological events exist. - Markdown tables for quantitative data, comparisons, or definitions. - Bulleted lists for clarity. - Only include content supported by the source; omit unsupported parts. - Bold key insights, terms, and conclusions. - Mark uncertain info as *Not specified/Uncertain*.- Bulleted lists should be plain, **without timestamps**.
Length: - Ensure the response has a minimum of 400 words
Depth: - The response should be brief in detail.

Language: - The entire output, including **section titles and labels**, must be written in the "${lang}" language (For example, ###Summary, ###Highlights, ###Key Insights, ###Outline, ###Core Concepts, ###Keywords, ###FAQ, etc. all need to be translated into ${lang} language.).
- Do **not** include any separators (\`---\`), or additional text outside of the task results.

The Video Transcript(the Text Content):
${transcriptText}`

  const params = new URLSearchParams({ t, nonce, sign, secret_key, app_id, uid })
  const aiRes = await fetch(`${apiUrl}?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: prompt })
  })

  const result = await aiRes.json()
  return {
    title: videoInfo?.name || videoId,
    summary: result,
    transcript: transcriptText
  }
}

export default {
    route: {
        method: "get",
        path: "/kana/youtube-summary",
        auth: false,
        tags: ["Kana · Downloader"],
        summary: "YouTube-Summary",
        description: "New code - YouTube-Summary.js",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL media yang akan diunduh",
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
            const result = await youtubeSummary(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

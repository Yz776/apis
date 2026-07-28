// YouTube Summary
// Original upstream: notegpt.io (their app_id is now invalid)
// Fix: use our own AI (/ai/gemini internally) to summarize the transcript.

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

async function getTranscript(videoId) {
  const transcriptRes = await fetch(`https://notegpt.io/api/v2/video-transcript?platform=youtube&video_id=${videoId}`, {
    headers: {
      'Accept': 'application/json',
      'Referer': 'https://notegpt.io/youtube-video-summarizer',
      'Origin': 'https://notegpt.io',
      'Cookie': COOKIES,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })
  const transcriptData = await transcriptRes.json()
  if (transcriptData.code !== 100000) throw new Error(transcriptData.message)

  const videoInfo = transcriptData.data.videoInfo
  const transcripts = transcriptData.data.transcripts
  const langKey = Object.keys(transcripts)[0]
  const transcriptList = transcripts[langKey].custom || transcripts[langKey].default
  const transcriptText = transcriptList.map(t => `[${t.start} ~ ${t.end}] ${t.text}`).join('\n\n')

  return { videoInfo, transcriptText }
}

// Ringkasan dibuat via Pollinations AI (gratis, no login, OpenAI-compatible).
// Fallback: kalau Pollinations gagal, kembalikan transcript saja tanpa summary.
async function summarizeWithAI(transcriptText, lang = 'id-ID') {
  // Batasi transcript agar tidak kelewatan context window
  const maxChars = 12000
  const truncated = transcriptText.length > maxChars
    ? transcriptText.slice(0, maxChars) + '\n\n[...transcript dipotong...]'
    : transcriptText

  const prompt = `You are an expert at summarizing video content. Based on the video transcript below, produce a structured summary in ${lang} language.

Format your response as Markdown with these sections:
### Ringkasan
(2-3 paragraf ringkasan utama)

### Poin-Poin Penting
- (3-5 bullet points berisi insight kunci)

### Outline
1. (urutan topik utama yang dibahas)

Transcript:
${truncated}`

  const body = JSON.stringify({
    model: 'openai',
    messages: [{ role: 'user', content: prompt }],
    private: true,
    referrer: 'kaminoa'
  })

  const res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body,
  })

  if (!res.ok) throw new Error(`AI summarize gagal (HTTP ${res.status})`)
  const data = await res.json()
  const answer = data?.choices?.[0]?.message?.content
  if (!answer) throw new Error('AI mengembalikan respons kosong')
  return answer.trim()
}

async function youtubeSummary(videoUrl, lang = 'id-ID') {
  const videoId = extractVideoId(videoUrl)
  const { videoInfo, transcriptText } = await getTranscript(videoId)

  let summary = null
  let summaryError = null
  try {
    summary = await summarizeWithAI(transcriptText, lang)
  } catch (e) {
    summaryError = e.message
  }

  return {
    title: videoInfo?.name || videoId,
    summary: summary || { error: summaryError || 'Gagal membuat ringkasan' },
    transcript: transcriptText
  }
}

export default {
    route: {
        method: "get",
        path: "/downloader/youtube-summary",
        auth: false,
        tags: ["Downloader"],
        summary: "YouTube Video Summary",
        description: "Mengambil transcript YouTube dan menghasilkan ringkasan terstruktur via AI. Transcript di-fetch dari notegpt.io, ringkasan dibuat via Pollinations AI (gratis).",
        parameters: [
            {
                name: "url",
                in: "query",
                required: true,
                description: "URL video YouTube (youtube.com/watch?v=... atau youtu.be/...)",
                schema: { type: "string", example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
            },
            {
                name: "lang",
                in: "query",
                required: false,
                description: "Bahasa ringkasan (default: id-ID)",
                schema: { type: "string", example: "id-ID" },
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
                                result: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        summary: { type: "string", description: "Ringkasan dalam Markdown" },
                                        transcript: { type: "string" },
                                    },
                                },
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
        const { url, lang = 'id-ID' } = req.query
        if (!url || !String(url).trim()) {
            return res.status(400).json({ ok: false, error: `url wajib diisi` })
        }
        try {
            const result = await youtubeSummary(String(url).trim(), lang)
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

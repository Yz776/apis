// Auto-generated from r2-kana.vercel.app snippet "hdvid.js" (uAIt1d)
// Source: https://r2-kana.vercel.app/#/snippet/uAIt1d
// Description: Untung MengHd Kan Suatu Video

import axios from 'axios'
import FormData from 'form-data'
import crypto from 'node:crypto'
import { createReadStream, existsSync, unlinkSync } from 'fs'
import { writeFile, stat } from 'fs/promises'
import { join } from 'path'
import { CookieJar } from 'tough-cookie'
import { wrapper } from 'axios-cookiejar-support'
import { save, tmpDir } from '../src/utils/tmp.js'

export const aliases = ['hdvid', 'enhance', 'hdvideo', 'upscale']
export const category = 'Tools'
export const help = [['.hdvid', 'Enhance kualitas video jadi Ultra HD (reply ke video)']]

const BASE_URL        = 'https://wink.ai'
const STRATEGY_URL    = 'https://strategy.app.meitudata.com'
const CLIENT_ID       = '1189857605'
const VERSION         = '5.1.2'
const COUNTRY_CODE    = 'ID'
const CLIENT_LANGUAGE = 'en_US'
const CLIENT_TIMEZONE = 'Asia/Jakarta'
const TASK_TYPE       = '11'
const CONTENT_TYPE    = '2'
const UA              = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36'

const sleep = ms => new Promise(r => setTimeout(r, ms))

function extToMime(file) {
  const ext = file.split('.').pop()?.toLowerCase()
  const map  = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska' }
  return map[ext] || 'application/octet-stream'
}

function makeTrace() {
  return `${crypto.randomBytes(16).toString('hex')}-${crypto.randomBytes(8).toString('hex')}-1`
}

function traceHeaders() {
  const trace = makeTrace()
  return {
    'sentry-trace': trace,
    baggage: [
      'sentry-environment=release',
      'sentry-release=5.1.2%20(b60d25c477f43c6dfac4107810f26d442320f4f1)',
      'sentry-public_key=e1bf914f3448d9bc8a10c7e499d17d54',
      `sentry-trace_id=${trace.split('-')[0]}`,
      'sentry-sampled=true',
      'sentry-sample_rate=0.75'
    ].join(',')
  }
}

async function createSession() {
  const GNUM = crypto.randomUUID()
  const jar  = new CookieJar()
  await jar.setCookie(`_sm=${GNUM}; Path=/; Domain=wink.ai`, BASE_URL)
  await jar.setCookie(`meitustat=${encodeURIComponent(JSON.stringify({ wgid: GNUM }))}; Path=/; Domain=wink.ai`, BASE_URL)

  const api = wrapper(axios.create({
    baseURL: BASE_URL, jar, withCredentials: true, validateStatus: () => true,
    headers: {
      accept: '*/*', origin: BASE_URL, referer: `${BASE_URL}/video-enhancer/upload`,
      'user-agent': UA,
      'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
      'sec-ch-ua-mobile': '?1', 'sec-ch-ua-platform': '"Android"',
      ab_info: JSON.stringify({ ab_codes: [], version: '1.4.4' })
    }
  }))

  const baseParams = (extra = {}) => new URLSearchParams({
    client_id: CLIENT_ID, version: VERSION, country_code: COUNTRY_CODE,
    gnum: GNUM, client_language: CLIENT_LANGUAGE, client_channel_id: '',
    client_timezone: CLIENT_TIMEZONE, ...extra
  })

  return { api, GNUM, baseParams }
}

async function getMaatSign(api, baseParams) {
  const params = baseParams({ suffix: '.mp4', type: 'temp', count: '1' })
  const res    = await api.get(`/api/file/get_maat_sign.json?${params}`, { headers: traceHeaders() })
  if (res.data?.code !== 0) throw new Error(`get_maat_sign gagal: ${JSON.stringify(res.data)}`)
  return res.data.data
}

async function getUploadPolicy(sign) {
  const params = new URLSearchParams({
    app: sign.app, count: String(sign.count), sig: sign.sig,
    sigTime: sign.sig_time, sigVersion: sign.sig_version,
    suffix: sign.suffix, type: sign.type
  })
  const res = await axios.get(`${STRATEGY_URL}/upload/policy?${params}`, {
    headers: { accept: '*/*', origin: BASE_URL, referer: `${BASE_URL}/`, 'user-agent': UA },
    validateStatus: () => true
  })
  if (!Array.isArray(res.data) || !res.data[0]?.qiniu) throw new Error(`upload policy gagal: ${JSON.stringify(res.data)}`)
  return res.data[0].qiniu
}

async function uploadToQiniu(policy, filePath, fileName) {
  const form = new FormData()
  form.append('file',  createReadStream(filePath), { filename: fileName, contentType: extToMime(fileName) })
  form.append('token', policy.token)
  form.append('key',   policy.key)
  form.append('fname', fileName)

  const res = await axios.post(policy.url, form, {
    headers: form.getHeaders({ origin: BASE_URL, referer: `${BASE_URL}/`, 'user-agent': UA, accept: '*/*' }),
    maxBodyLength: Infinity, maxContentLength: Infinity, validateStatus: () => true
  })

  if (res.status >= 400) throw new Error(`upload qiniu gagal HTTP ${res.status}`)
  if (!res.data?.url && !res.data?.data) throw new Error(`upload qiniu response tidak valid`)
  return { file_key: policy.key, source_url: res.data.url || res.data.data || policy.data || '' }
}

async function startTranscode(api, baseParams, fileKey) {
  const body = baseParams({ file_key: fileKey })
  const res  = await api.post('/api/file/video_trans_start.json', body.toString(), {
    headers: { ...traceHeaders(), 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }
  })
  if (res.data?.code !== 0 || !res.data?.data?.id) throw new Error(`transcode start gagal: ${JSON.stringify(res.data)}`)
  return res.data.data.id
}

async function waitTranscode(api, baseParams, id, fallback, maxTry = 80) {
  for (let i = 0; i < maxTry; i++) {
    const params = baseParams({ id })
    const res    = await api.get(`/api/file/video_trans_query.json?${params}`, { headers: traceHeaders() })
    const data   = res.data?.data || {}
    const vt     = data.video_transcoded || data.transcoded_video || data.transcoded_url || data.video_url || ''
    if (vt) return { source_url: data.video || data.url || fallback, video_transcoded: vt }
    await sleep(3000)
  }
  return { source_url: fallback, video_transcoded: fallback }
}

async function delivery(api, baseParams, sourceUrl, videoTranscoded, taskName) {
  const body = baseParams({
    type: TASK_TYPE, content_type: CONTENT_TYPE, source_url: sourceUrl,
    type_params:  JSON.stringify({ is_mirror: 0, orientation_tag: 1, j_420_trans: '1', return_ext: '2' }),
    right_detail: JSON.stringify({ source: '1', touch_type: '4', function_id: '630', material_id: '63011', url: 'https://wink.ai/video-enhancer/upload' }),
    ext_params:   JSON.stringify({ task_name: taskName, records: TASK_TYPE, video_transcoded: videoTranscoded }),
    with_prepare: '1'
  })
  const res = await api.post('/api/meitu_ai/delivery.json', body.toString(), {
    headers: { ...traceHeaders(), 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }
  })
  if (res.data?.code !== 0) throw new Error(`delivery gagal: ${JSON.stringify(res.data)}`)
  const data = res.data.data || {}
  return { msg_id: data.msg_id || data.prepare_msg_id || '' }
}

function extractResultUrl(data) {
  const item  = data?.item_list?.[0]
  const media = item?.result?.media_info_list?.[0]
  return media?.media_data || item?.result?.result_url || item?.result?.url || ''
}

function extractNextMsgId(data, currentMsgId) {
  const item        = data?.item_list?.[0]
  const resultValue = item?.result?.result || ''
  const realMsgId   = item?.result?.msg_id || item?.msg_id || ''
  if (resultValue && resultValue !== currentMsgId && !resultValue.startsWith('http')) return resultValue
  if (realMsgId   && realMsgId   !== currentMsgId && !realMsgId.startsWith('wpr_'))  return realMsgId
  return ''
}

async function waitResult(api, baseParams, firstMsgId, maxTry = 120) {
  let msgId = firstMsgId
  for (let i = 0; i < maxTry; i++) {
    const params = baseParams({ msg_ids: msgId })
    const res    = await api.get(`/api/meitu_ai/query_batch.json?${params}`, {
      headers: { ...traceHeaders(), referer: `${BASE_URL}/video-enhancer/upload` }
    })
    if (res.data?.code !== 0) throw new Error(`query batch gagal: ${JSON.stringify(res.data)}`)
    const data = res.data.data
    const next = extractNextMsgId(data, msgId)
    if (next) { msgId = next; await sleep(1000); continue }
    const url       = extractResultUrl(data)
    const errorCode = data?.item_list?.[0]?.result?.error_code
    const errorMsg  = data?.item_list?.[0]?.result?.error_msg
    if (url && url.startsWith('http') && (errorCode === 0 || errorCode == null)) return url
    if (errorCode && errorCode !== 29901 && errorCode !== 0) throw new Error(`task gagal: ${errorCode} ${errorMsg || ''}`)
    await sleep(5000)
  }
  throw new Error('Timeout: hasil tidak selesai dalam waktu yang ditentukan.')
}



export default {
    route: {
        method: "get",
        path: "/kana/hdvid",
        auth: false,
        tags: ["Tools"],
        summary: "hdvid",
        description: "Untung MengHd Kan Suatu Video",
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
            const result = await editStatus(String(url).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}

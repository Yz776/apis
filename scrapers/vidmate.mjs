import crypto from 'node:crypto';

const AES_KEY = Buffer.from('4c9b7d2e'.repeat(3) + '4c9b7d21', 'utf-8');
const AES_IV = Buffer.from('4c9b7d2e4c9b7d2e', 'utf-8');
const API_URL = 'https://api.vidssave.com/api/contentsite_api/media/parse';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function decryptPayload(ciphertext) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', AES_KEY, AES_IV);
  decipher.setAutoPadding(false);
  let decrypted = decipher.update(ciphertext, 'base64', 'utf-8');
  decrypted += decipher.final('utf-8');
  return JSON.parse(decrypted.replace(/\0+$/, ''));
}

export async function parseMedia(url) {
  if (!url || typeof url !== 'string') throw new Error('Valid media URL is required');
  const target = url.trim();

  const payload = {
    hostname: 'vidssave.com',
    auth: '4c9b7d21',
    domain: 'api-ak.vidssave.com',
    link: target,
    source: 'source'
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
      'Origin': 'https://vidssave.com',
      'Referer': 'https://vidssave.com/'
    },
    body: new URLSearchParams(payload).toString()
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.status !== 1 || !json.data) {
    throw new Error(json.message || 'Media parse failed or unsupported URL');
  }

  const rawData = typeof json.data === 'string' ? decryptPayload(json.data) : json.data;

  const resources = (rawData.resources || []).map(r => ({
    quality: r.quality || 'Default',
    format: (r.format || 'mp4').toLowerCase(),
    type: r.type || 'video',
    sizeBytes: r.size || 0,
    downloadUrl: r.download_url
  }));

  const videos = resources.filter(r => r.type === 'video');
  const audios = resources.filter(r => r.type === 'audio');

  return {
    sourceUrl: target,
    title: rawData.title || '',
    duration: rawData.duration || 0,
    thumbnail: rawData.thumbnail || null,
    totalVideos: videos.length,
    totalAudios: audios.length,
    videos,
    audios
  };
}

export async function downloadBest(url) {
  const parsed = await parseMedia(url);
  const bestVideo = parsed.videos[0] || null;
  const bestAudio = parsed.audios[0] || null;

  return {
    title: parsed.title,
    duration: parsed.duration,
    thumbnail: parsed.thumbnail,
    bestVideo,
    bestAudio
  };
}

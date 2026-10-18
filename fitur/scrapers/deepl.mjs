const ENDPOINTS = [
  'https://oneshot.fal.free.deepl.com/v1/translate',
  'https://oneshot.kef.free.deepl.com/v1/translate'
];

const USER_AGENT = 'DeepL/26.41.0 (com.deepl.mobiletranslator; build:264100; Android 14)';

const SUPPORTED_LANGUAGES = {
  ar: 'Arabic',
  bg: 'Bulgarian',
  cs: 'Czech',
  da: 'Danish',
  de: 'German',
  el: 'Greek',
  en: 'English',
  'en-US': 'English (American)',
  'en-GB': 'English (British)',
  es: 'Spanish',
  et: 'Estonian',
  fi: 'Finnish',
  fr: 'French',
  hu: 'Hungarian',
  id: 'Indonesian',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  lt: 'Lithuanian',
  lv: 'Latvian',
  nb: 'Norwegian (Bokmål)',
  nl: 'Dutch',
  pl: 'Polish',
  'pt-BR': 'Portuguese (Brazilian)',
  'pt-PT': 'Portuguese (European)',
  ro: 'Romanian',
  ru: 'Russian',
  sk: 'Slovak',
  sl: 'Slovenian',
  sv: 'Swedish',
  tr: 'Turkish',
  uk: 'Ukrainian',
  'zh-Hans': 'Chinese (Simplified)',
  'zh-Hant': 'Chinese (Traditional)'
};

const LANG_ALIASES = {
  zh: 'zh-Hans',
  'zh-cn': 'zh-Hans',
  'zh-sg': 'zh-Hans',
  'zh-tw': 'zh-Hant',
  'zh-hk': 'zh-Hant',
  pt: 'pt-PT',
  no: 'nb',
  'en-us': 'en-US',
  'en-gb': 'en-GB',
  'pt-br': 'pt-BR',
  'pt-pt': 'pt-PT',
  'zh-hans': 'zh-Hans',
  'zh-hant': 'zh-Hant'
};

function normalizeLang(lang, defaultLang = 'id') {
  if (!lang || typeof lang !== 'string') return defaultLang;
  const trimmed = lang.trim();
  const lower = trimmed.toLowerCase();
  if (LANG_ALIASES[lower]) return LANG_ALIASES[lower];
  for (const code of Object.keys(SUPPORTED_LANGUAGES)) {
    if (code.toLowerCase() === lower) return code;
  }
  return trimmed;
}

async function requestDeepL(payload) {
  let lastError = null;

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
      }

      const data = await res.json();
      if (data && Array.isArray(data.translations)) {
        return data;
      }
      throw new Error('Invalid response structure from DeepL API');
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All DeepL endpoints failed');
}

export async function translate(text, options = {}) {
  const isArray = Array.isArray(text);
  const textList = isArray ? text : [text];

  const cleanedTexts = textList.map(t => (t === null || t === undefined ? '' : String(t)));

  if (cleanedTexts.length === 0 || cleanedTexts.every(t => t.trim() === '')) {
    throw new Error('Text to translate must not be empty');
  }

  const targetLang = normalizeLang(options.to || options.target || options.target_lang || options.targetLang, 'id');
  const sourceLangInput = options.from || options.source || options.source_lang || options.sourceLang;
  const sourceLang = sourceLangInput ? normalizeLang(sourceLangInput, null) : null;

  const payload = {
    text: cleanedTexts,
    target_lang: targetLang
  };

  if (sourceLang) {
    payload.source_lang = sourceLang;
  }

  const response = await requestDeepL(payload);
  const translations = response.translations || [];

  const results = translations.map((item, index) => ({
    original: cleanedTexts[index],
    translated: item.text,
    source_lang: item.detected_source_language,
    target_lang: targetLang,
    is_confident: Boolean(item.is_language_detection_confident)
  }));

  if (!isArray) {
    const first = results[0];
    return {
      success: true,
      text: first.translated,
      original: first.original,
      source_lang: first.source_lang,
      target_lang: first.target_lang,
      is_confident: first.is_confident
    };
  }

  return {
    success: true,
    translations: results,
    target_lang: targetLang
  };
}

export async function detect(text) {
  if (text === null || text === undefined || String(text).trim() === '') {
    throw new Error('Text to detect must not be empty');
  }

  const sample = String(text);
  const res = await translate(sample, { to: 'en' });
  return {
    success: true,
    language: res.source_lang,
    is_confident: res.is_confident
  };
}

export function getLanguages() {
  return {
    success: true,
    total: Object.keys(SUPPORTED_LANGUAGES).length,
    languages: { ...SUPPORTED_LANGUAGES }
  };
}

export async function download(query, options = {}) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Query string is required for download/translation');
  }

  const targetLang = normalizeLang(options.to || options.target || options.target_lang || options.targetLang, 'id');
  const sourceLang = options.from || options.source || options.source_lang || options.sourceLang;

  const result = await translate(query, { to: targetLang, from: sourceLang });

  return {
    success: true,
    query,
    translated_text: result.text,
    source_language: result.source_lang,
    target_language: result.target_lang,
    is_confident: result.is_confident
  };
}

export default {
  translate,
  download,
  detect,
  getLanguages
};
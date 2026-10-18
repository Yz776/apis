const ENDPOINT = 'https://us-central1-ai-chat-bot-bf47e.cloudfunctions.net/chat_function_android';

function formatMessages(input, systemPrompt) {
  const messages = [];
  if (systemPrompt && typeof systemPrompt === 'string') {
    messages.push({ role: 'system', content: systemPrompt });
  }
  if (typeof input === 'string') {
    messages.push({ role: 'user', content: input });
  } else if (Array.isArray(input)) {
    for (const msg of input) {
      if (typeof msg === 'string') {
        messages.push({ role: 'user', content: msg });
      } else if (msg && typeof msg === 'object' && msg.content) {
        messages.push({
          role: msg.role || 'user',
          content: String(msg.content)
        });
      }
    }
  }
  return messages;
}

export async function chat(input, options = {}) {
  const model = options.model === 'gpt-4o' ? 'gpt-4o' : 'gpt-4o-mini';
  const messages = formatMessages(input, options.system);

  if (messages.length === 0) {
    throw new Error('Input message must not be empty');
  }

  const payload = {
    data: {
      model,
      messages,
      timeZone: options.timeZone || 'Asia/Jakarta',
      countryCode: options.countryCode || 'ID'
    }
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  const choice = data.result?.choices?.[0];

  if (!choice || !choice.message) {
    throw new Error(data.error?.message || 'Invalid response from AI server');
  }

  return {
    success: true,
    model,
    role: choice.message.role || 'assistant',
    text: choice.message.content || '',
    created: data.result?.created || Math.floor(Date.now() / 1000),
    id: data.result?.id || null
  };
}

export async function ask(prompt, options = {}) {
  return chat(prompt, options);
}

export async function download(query, options = {}) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Query string is required for download');
  }
  const res = await chat(query, options);
  return {
    success: true,
    query,
    result: res.text,
    model: res.model
  };
}

export default {
  chat,
  ask,
  download
};
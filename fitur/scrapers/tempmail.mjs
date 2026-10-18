import https from 'node:https';

const BASE_URL = 'https://mob2.temp-mail.org';
const RPC_URL = 'https://papi2.temp-mail.org/rpc/';
const DEFAULT_USER_AGENT = 'okhttp/4.12.0';

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const headers = {
      'User-Agent': DEFAULT_USER_AGENT,
      'Accept': 'application/json',
      ...options.headers
    };

    let bodyData = null;
    if (options.body) {
      if (typeof options.body === 'object' && !Buffer.isBuffer(options.body)) {
        bodyData = JSON.stringify(options.body);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      } else {
        bodyData = options.body;
      }
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    } else if (options.method === 'POST') {
      headers['Content-Length'] = 0;
    }

    const req = https.request(parsedUrl, {
      method: options.method || 'GET',
      headers,
      agent: options.agent
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('application/octet-stream') || options.raw) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            return resolve(buffer);
          }
        }
        const text = buffer.toString('utf8');
        let parsed = text;
        try {
          parsed = JSON.parse(text);
        } catch {}

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
        } else {
          const err = new Error(typeof parsed === 'object' && (parsed.error || parsed.errorMessage) ? (parsed.error || parsed.errorMessage) : `HTTP ${res.statusCode}: ${text}`);
          err.status = res.statusCode;
          err.response = parsed;
          reject(err);
        }
      });
    });

    req.on('error', reject);
    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

export async function createMailbox(options = {}) {
  return request(`${BASE_URL}/mailbox`, {
    method: 'POST',
    ...options
  });
}

export async function rotateMailbox(token, options = {}) {
  if (!token) throw new Error('Token is required');
  return request(`${BASE_URL}/mailbox`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    ...options
  });
}

export async function getMailbox(token, options = {}) {
  if (!token) throw new Error('Token is required');
  return request(`${BASE_URL}/mailbox`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    ...options
  });
}

export async function getMessages(token, after = null, options = {}) {
  if (!token) throw new Error('Token is required');
  let url = `${BASE_URL}/messages`;
  if (after) {
    url += `?after=${encodeURIComponent(after)}`;
  }
  return request(url, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    ...options
  });
}

export async function getMessage(token, emailId, options = {}) {
  if (!token) throw new Error('Token is required');
  if (!emailId) throw new Error('emailId is required');
  return request(`${BASE_URL}/messages/${encodeURIComponent(emailId)}/`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    ...options
  });
}

export async function getAttachment(token, emailId, attachmentId, options = {}) {
  if (!token) throw new Error('Token is required');
  if (!emailId || !attachmentId) throw new Error('emailId and attachmentId are required');
  return request(`${BASE_URL}/messages/${encodeURIComponent(emailId)}/attachment/${encodeURIComponent(attachmentId)}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/octet-stream'
    },
    raw: true,
    ...options
  });
}

export async function getSource(token, emailId, options = {}) {
  if (!token) throw new Error('Token is required');
  if (!emailId) throw new Error('emailId is required');
  const buffer = await request(`${BASE_URL}/messages/${encodeURIComponent(emailId)}/source`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/octet-stream'
    },
    raw: true,
    ...options
  });
  return buffer.toString('utf8');
}

export async function getDomains(options = {}) {
  const res = await request(RPC_URL, {
    method: 'POST',
    body: {
      jsonrpc: '2.0',
      id: 1,
      method: 'getdomains',
      params: {}
    },
    ...options
  });
  return res.result;
}

export default {
  createMailbox,
  rotateMailbox,
  getMailbox,
  getMessages,
  getMessage,
  getAttachment,
  getSource,
  getDomains
};

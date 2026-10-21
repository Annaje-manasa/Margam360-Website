// How the widget talks to the assistant.
//  - Production: POST /api/chat on our own server (SSE stream). No keys in the browser.
//  - Preview build (`--mode single`, used for the claude.ai artifact preview): the
//    artifact's built-in Claude access, with the same knowledge + rules.

const API_BASE = (import.meta.env.VITE_CHAT_API_URL || '').replace(/\/$/, '');

export class ChatError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const FALLBACK = 'Something went wrong. Please try again, or reach us at hi@margam360.com / +91 88855 54621.';

/**
 * Stream an answer.
 * @param {{role:'user'|'assistant', content:string}[]} messages  ends with the visitor's message
 * @param {{signal?:AbortSignal, onText:(fullTextSoFar:string)=>void}} opts
 * @returns {Promise<{text:string, truncated:boolean}>}
 */
export async function streamChat(messages, opts) {
  if (import.meta.env.MODE === 'single') {
    const { streamViaArtifact } = await import('./transport-artifact.js');
    return streamViaArtifact(messages, opts);
  }
  return streamViaServer(messages, opts);
}

async function streamViaServer(messages, { signal, onText }) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new ChatError('cancelled', '');
    throw new ChatError('network', 'Can’t reach the assistant. Check your connection and try again.');
  }

  if (!res.ok || !res.headers.get('content-type')?.includes('text/event-stream')) {
    let msg = FALLBACK, code = 'upstream_error';
    try { const j = await res.json(); msg = j.error?.message || msg; code = j.error?.code || code; } catch { /* not json */ }
    throw new ChatError(code, msg);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', text = '', truncated = false;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) !== -1) {
        const raw = buf.slice(0, i);
        buf = buf.slice(i + 2);
        let event = 'message', data = '';
        for (const line of raw.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data += line.slice(5).trim();
        }
        if (!data) continue;
        const payload = JSON.parse(data);
        if (event === 'delta') { text += payload.text; onText(text); }
        else if (event === 'done') truncated = !!payload.truncated;
        else if (event === 'error') throw new ChatError(payload.code || 'upstream_error', payload.message || FALLBACK);
      }
    }
  } catch (e) {
    if (e instanceof ChatError) { e.partial = text; throw e; }
    if (e.name === 'AbortError') { const c = new ChatError('cancelled', ''); c.partial = text; throw c; }
    const c = new ChatError('network', 'The connection dropped. Please try again.'); c.partial = text; throw c;
  }
  if (!text.trim()) throw new ChatError('empty', FALLBACK);
  return { text, truncated };
}

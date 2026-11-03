// Margam360 web server: serves the built React site and the Margam AI chatbot API.
// Grounded in published Margam360 website information and knowledge base.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { parseDoc, buildIndex, selectContext, formatContext, systemInstructions, CONTACT_LINE } from '../shared/knowledge.js';
import { createLimiter } from './rate-limit.js';
import { generateResponse, streamResponse } from './knowledge-engine.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = (k, d) => (process.env[k] ?? d);

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const customOrigins = env('ALLOWED_ORIGINS', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

let rawModel = env('CHAT_MODEL', 'claude-3-5-haiku-20241022');
if (rawModel === 'claude-haiku-5-5') rawModel = 'claude-3-5-haiku-20241022';

const CONFIG = {
  port: Number(env('PORT', 3000)),
  model: rawModel,
  maxTokens: Number(env('CHAT_MAX_TOKENS', 700)),
  allowedOrigins: Array.from(new Set([...DEFAULT_ORIGINS, ...customOrigins])),
  perMinute: Number(env('CHAT_RATE_PER_MINUTE', 60)),
  perDay: Number(env('CHAT_RATE_PER_DAY', 300)),
  globalPerDay: Number(env('CHAT_GLOBAL_DAILY_LIMIT', 5000)),
  maxTurns: 16,
  maxMessageChars: 1500,
  maxTotalChars: 12000,
  trustProxy: env('TRUST_PROXY', '1'),
};

const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim());
if (!hasAnthropicKey) {
  console.log('ℹ  No ANTHROPIC_API_KEY found. Margam AI will use the built-in grounded knowledge engine (RAG).');
}

const anthropic = hasAnthropicKey
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 60_000 })
  : null;

/* ---------------- knowledge ---------------- */
let INDEX;
function loadKnowledge() {
  const dir = path.join(root, 'knowledge');
  const files = [];
  const walk = (d) =>
    fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md')) files.push(p);
    });
  walk(dir);
  const docs = files.map((f) => parseDoc(fs.readFileSync(f, 'utf8'), path.basename(f, '.md')));
  INDEX = buildIndex(docs);
  console.log(`knowledge: ${docs.length} docs → ${INDEX.chunks.length} chunks (${INDEX.totalChars.toLocaleString()} chars)`);
}
loadKnowledge();

// pick up edits without a restart (crawl, FAQ changes)
let reloadTimer;
fs.watch(path.join(root, 'knowledge'), { recursive: true }, () => {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    try {
      loadKnowledge();
    } catch (e) {
      console.error('knowledge reload failed', e.message);
    }
  }, 300);
});

/* ---------------- app ---------------- */
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', CONFIG.trustProxy === 'false' ? false : Number(CONFIG.trustProxy) || CONFIG.trustProxy);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// CORS — support local dev (Vite) and configured production origins
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (sameOrigin(req, origin) || CONFIG.allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(origin && (sameOrigin(req, origin) || CONFIG.allowedOrigins.includes(origin)) ? 204 : 403);
  }
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    ai: Boolean(anthropic),
    provider: anthropic ? 'anthropic' : 'knowledge-engine',
    model: anthropic ? CONFIG.model : 'margam-knowledge-engine',
    knowledgeChunks: INDEX?.chunks?.length || 0,
  });
});

const limiter = createLimiter({
  perMinute: CONFIG.perMinute,
  perDay: CONFIG.perDay,
  globalPerDay: CONFIG.globalPerDay,
});

function validate(body) {
  if (!body || !Array.isArray(body.messages)) return 'messages must be an array';
  const msgs = body.messages.slice(-CONFIG.maxTurns);
  if (!msgs.length) return 'messages is empty';
  let total = 0;
  for (const m of msgs) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return 'invalid role';
    if (typeof m.content !== 'string' || !m.content.trim()) return 'invalid content';
    if (m.role === 'user' && m.content.length > CONFIG.maxMessageChars) {
      return `message too long (max ${CONFIG.maxMessageChars} characters)`;
    }
    total += m.content.length;
  }
  if (msgs[msgs.length - 1].role !== 'user') return 'last message must be from the user';
  return { msgs, total };
}

// Turn the client's history into a valid alternating transcript that starts with a user turn
function normalise(msgs) {
  const out = [];
  for (const m of msgs) {
    const content = m.content.slice(0, m.role === 'assistant' ? 4000 : CONFIG.maxMessageChars);
    if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += '\n\n' + content;
    else out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  let size = out.reduce((a, m) => a + m.content.length, 0);
  while (size > CONFIG.maxTotalChars && out.length > 1) {
    size -= out.shift().content.length;
    if (out[0]?.role === 'assistant') size -= out.shift().content.length;
  }
  return out;
}

app.post('/api/chat', express.json({ limit: '48kb' }), async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !sameOrigin(req, origin) && !CONFIG.allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: { code: 'forbidden_origin', message: 'Origin not allowed.' } });
  }

  const v = validate(req.body);
  if (typeof v === 'string') return res.status(400).json({ error: { code: 'bad_request', message: v } });

  const limit = limiter.check(req.ip);
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({
      error: {
        code: 'rate_limited',
        message: `You're sending messages quickly. Please try again in ${limit.retryAfter}s, or reach us directly: ${CONTACT_LINE}`,
      },
    });
  }

  const messages = normalise(v.msgs);
  const ctx = selectContext(INDEX, messages);

  // Server-Sent Events headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const ping = setInterval(() => res.write(': ping\n\n'), 15000);

  const abort = new AbortController();
  res.on('close', () => abort.abort());

  const started = Date.now();
  let streamedSuccessfully = false;

  // Try external Anthropic Claude API if configured
  if (anthropic) {
    try {
      const stream = anthropic.messages.stream(
        {
          model: CONFIG.model,
          max_tokens: CONFIG.maxTokens,
          system: [
            { type: 'text', text: systemInstructions() },
            {
              type: 'text',
              text: `<knowledge mode="${ctx.mode}">\n${formatContext(ctx.chunks)}\n</knowledge>`,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages,
        },
        { signal: abort.signal }
      );

      stream.on('text', (delta) => send('delta', { text: delta }));
      const final = await stream.finalMessage();
      send('done', { stop_reason: final.stop_reason, truncated: final.stop_reason === 'max_tokens' });
      streamedSuccessfully = true;
      console.log(`[Claude] chat ok ${Date.now() - started}ms in=${final.usage?.input_tokens} out=${final.usage?.output_tokens}`);
    } catch (err) {
      if (abort.signal.aborted) {
        console.log('chat aborted by client');
        clearInterval(ping);
        return res.end();
      }
      console.warn('Anthropic API call failed, falling back to grounded knowledge engine:', err.message);
    }
  }

  // Use grounded knowledge synthesis engine (if no Anthropic key, or if Anthropic failed)
  if (!streamedSuccessfully && !abort.signal.aborted) {
    try {
      const answer = generateResponse(messages, INDEX);
      await streamResponse(answer, send, abort.signal);
      send('done', { stop_reason: 'end_turn', truncated: false });
      console.log(`[KnowledgeEngine] chat ok ${Date.now() - started}ms`);
    } catch (err) {
      if (!abort.signal.aborted) {
        console.error('KnowledgeEngine stream error:', err);
        send('error', {
          code: 'upstream_error',
          message: `Something went wrong. Please try again, or reach us directly: ${CONTACT_LINE}`,
        });
      }
    }
  }

  clearInterval(ping);
  res.end();
});

function sameOrigin(req, origin) {
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

/* ---------------- static site ---------------- */
const dist = path.join(root, 'dist');
if (fs.existsSync(dist)) {
  app.use(
    express.static(dist, {
      index: false,
      setHeaders: (res, p) => {
        if (p.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.use('/api', (req, res) => res.status(404).json({ error: { code: 'not_found', message: 'Not found' } }));

export default app;

// Start server when run directly
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun || process.env.NODE_ENV !== 'test') {
  app.listen(CONFIG.port, () => {
    console.log(`Margam360 server on http://localhost:${CONFIG.port} (ai: ${anthropic ? CONFIG.model : 'grounded-engine'})`);
  });
}

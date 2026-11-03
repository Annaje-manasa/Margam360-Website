// Knowledge indexing + grounded prompt — shared by the Node server and the
// in-artifact preview. Pure functions: no fs, no network.

/** Parse a markdown file with optional `---` frontmatter. */
export function parseDoc(raw, fallbackName = 'doc') {
  let meta = {};
  let body = raw.replace(/\r\n/g, '\n');
  const fm = body.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    body = body.slice(fm[0].length);
    for (const line of fm[1].split('\n')) {
      const m = line.match(/^(\w+):\s*(.*)$/);
      if (m) meta[m[1]] = m[2].trim();
    }
  }
  body = body.replace(/<!--[\s\S]*?-->/g, '').trim(); // drop editor notes
  return { title: meta.title || fallbackName, url: meta.url || '', source: meta.source || 'doc', body };
}

/** Split a doc into heading-scoped chunks (~1,200 chars max). */
export function chunkDoc(doc, maxChars = 1200) {
  const chunks = [];
  let heading = doc.title;
  let buf = [];
  const flush = () => {
    const text = buf.join('\n').trim();
    if (text) {
      // further split oversized sections on paragraph boundaries
      let part = '';
      for (const para of text.split(/\n{2,}/)) {
        if ((part + '\n\n' + para).length > maxChars && part) {
          chunks.push({ heading, text: part.trim() });
          part = para;
        } else part = part ? part + '\n\n' + para : para;
      }
      if (part.trim()) chunks.push({ heading, text: part.trim() });
    }
    buf = [];
  };
  for (const line of doc.body.split('\n')) {
    const h = line.match(/^#{1,3}\s+(.*)/);
    if (h) { flush(); heading = h[1].trim(); continue; }
    buf.push(line);
  }
  flush();
  return chunks.map((c, i) => ({
    id: `${doc.source}:${slug(doc.title)}:${i}`,
    title: doc.title,
    url: doc.url,
    source: doc.source,
    heading: c.heading,
    text: c.text,
  }));
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const STOP = new Set(
  'a an and are as at be by can do does for from has have how i if in is it its me my of on or our so that the their them they this to us was we what when where which who why will with you your yours hi hello hey heya greetings please thanks thank ok okay yes no'.split(' ')
);

export const tokenize = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}%₹$ ]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t))
    .map((t) => t.replace(/(ing|ies|es|s)$/, ''));

/** Build a BM25 index over chunks. */
export function buildIndex(docs) {
  const chunks = docs.flatMap((d) => chunkDoc(d));
  const toks = chunks.map((c) => tokenize(`${c.heading} ${c.heading} ${c.text}`));
  const df = new Map();
  toks.forEach((t) => new Set(t).forEach((w) => df.set(w, (df.get(w) || 0) + 1)));
  const avg = toks.reduce((a, t) => a + t.length, 0) / Math.max(1, toks.length);
  const totalChars = chunks.reduce((a, c) => a + c.text.length, 0);
  return { chunks, toks, df, avg, totalChars };
}

/** Top-k chunks for a query (BM25). */
export function search(index, query, k = 8) {
  const q = tokenize(query);
  if (!q.length) return [];
  const N = index.chunks.length;
  const scored = index.toks.map((t, i) => {
    let s = 0;
    for (const w of q) {
      const f = t.filter((x) => x === w).length;
      if (!f) continue;
      const idf = Math.log(1 + (N - index.df.get(w) + 0.5) / (index.df.get(w) + 0.5));
      s += idf * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (t.length / index.avg))));
    }
    return [s, i];
  });
  return scored.filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).slice(0, k).map(([, i]) => index.chunks[i]);
}

/**
 * Pick the context for a conversation.
 */
export function selectContext(index, messages, { fullContextChars = 60000, k = 10 } = {}) {
  if (index.totalChars <= fullContextChars) return { mode: 'full', chunks: index.chunks };
  const recentUser = messages.filter((m) => m.role === 'user').slice(-3).map((m) => m.content).join(' ');
  const hits = search(index, recentUser, k);
  const contact = index.chunks.filter((c) => /contact/i.test(c.heading)).slice(0, 1);
  const seen = new Set();
  return { mode: 'retrieval', chunks: [...hits, ...contact].filter((c) => !seen.has(c.id) && seen.add(c.id)) };
}

export function formatContext(chunks) {
  return chunks.map((c) =>
    `<document id="${c.id}" title="${esc(c.title)}" section="${esc(c.heading)}"${c.url ? ` url="${c.url}"` : ''}>\n${c.text}\n</document>`
  ).join('\n\n');
}
const esc = (s) => String(s).replace(/"/g, '&quot;');

export const CONTACT_LINE = 'Email hi@margam360.com, call or WhatsApp +91 88855 54621 (Mon–Fri, 9 AM–6 PM IST), or book the free 30-minute strategy call on the website.';

/** The standing instructions. Kept separate from the knowledge so the knowledge block can be cached. */
export function systemInstructions(today = new Date()) {
  return `You are Margam AI, the official AI assistant of Margam360.

Your responsibility is to help website visitors understand Margam360, its services, marketing strategies, business solutions, published results and consultation process.

Today's date: ${today.toISOString().slice(0, 10)}.

IMPORTANT CONVERSATION RULES:

1. Always understand the user's latest message before generating a response.
2. Identify the actual intent of the message.
3. Respond directly to what the user asked.
4. Never return unrelated information.
5. If the user greets you, greet them naturally.
6. If the user asks about pricing, discuss pricing.
7. If the user asks about services, explain services.
8. If the user asks a follow-up question, use previous conversation messages to understand its context.
9. Maintain the conversation history for the current session.
10. Do not repeat the same introductory response unnecessarily.
11. Never invent company information, pricing, testimonials, results or guarantees.
12. If the answer is not available in the official Margam360 knowledge base, clearly communicate that you do not have the information.
13. Keep responses friendly, professional, clear and conversational.
14. Ask relevant clarification questions when the user's request is ambiguous.
15. Never assume that every message is related to pricing.

CONVERSATION STYLE:

- Natural and human-like.
- Friendly and professional.
- Clear and concise.
- Helpful rather than overly promotional.
- Use simple language.
- Avoid unnecessarily long responses.
- Use occasional emojis where appropriate.

Your priority is to understand the conversation, not simply retrieve a random matching answer from the knowledge base.

${CONTACT_LINE}`;
}

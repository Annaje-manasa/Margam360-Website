# Margam360 — website + Margam AI chatbot

React (Vite) front end, plus a small Node/Express server that serves the site and runs the
chatbot on the Claude API. The API key exists **only on the server**.

```
Browser ──(POST /api/chat, streamed reply)──▶ server/index.js ──▶ Claude API
   ▲                                              │
   └── chat widget (src/components/chat)          └── knowledge/*.md (site content index)
```

## Quick start

```bash
npm install
cp .env.example .env          # paste your ANTHROPIC_API_KEY
npm run build                 # builds the site (and refreshes the knowledge from the site copy)
npm start                     # http://localhost:3000  — site + chatbot
```

Development with hot reload: run `npm run dev:api` (server on :3000) and `npm run dev` (Vite on :5173,
which proxies `/api` to :3000).

## Deploying (pick one)

**Any Node host (Render, Railway, Fly.io, a VPS, Hostinger VPS):** build command `npm install && npm run build`,
start command `npm start`, set `ANTHROPIC_API_KEY` in the host's environment settings. Done — one service
serves the site and the API on the same domain, so no CORS setup is needed.

**Docker:** `docker build -t margam360 . && docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-... margam360`

**Site on a static host (Vercel/Netlify) + API elsewhere:** build the site with
`VITE_CHAT_API_URL=https://api.yourdomain.com npm run build`, deploy `dist/` statically, run the server
on a Node host, and set `ALLOWED_ORIGINS=https://margam360.com` on the server.

Health check: `GET /api/health` → `{ ok, ai, model, knowledgeChunks }`.

## What the chatbot knows (and how to change it)

Everything the bot may say lives in `knowledge/`, as plain Markdown:

| Folder | What | How it's updated |
|---|---|---|
| `knowledge/crawled/` | Pages crawled from margam360.com | `npm run crawl` |
| `knowledge/generated/website.md` | The new site's own copy (`src/data/content.js`) | automatic on build/start |
| `knowledge/curated/faq.md` | Hand-written FAQs | edit by hand |

The server reloads the knowledge automatically when these files change.

* **Add a FAQ or pricing:** add a `## Question?` + answer to `knowledge/curated/faq.md`. The bot treats it as fact,
  so only write what you are happy to say publicly. Pricing is deliberately *not* included right now — the bot
  says it isn't published and points to the free call.
* **Re-crawl the live site:** `npm run crawl`. It reads the sitemap, skips `/team/`, `/project/`, `/testimonials/`,
  thin pages (< 60 words) and pages full of lorem-ipsum/theme-demo text. Filters are in `knowledge/crawl.config.json`.
  (Today the live WordPress site's blog, team, project and testimonial pages are theme placeholders, so only the
  homepage is indexed.)
* **Grounding rules / tone:** `systemInstructions()` in `shared/knowledge.js`. The bot answers only from the
  knowledge, says plainly when it doesn't know, never invents prices or stats, and offers email / WhatsApp / the call.
* **Retrieval:** the knowledge is small (~8k characters), so all of it is sent with each request and cached by the
  API (cheap and most accurate). Past 60k characters the server automatically switches to BM25 retrieval of the
  most relevant sections.

## Security & cost controls (server/index.js)

* API key read from the environment only; never sent to the browser (verify: it isn't in `dist/`).
* Same-origin only by default; cross-origin requests need `ALLOWED_ORIGINS`.
* Input validation: roles, 1,500 characters per message, last 16 turns, 48 KB body.
* Rate limits per IP (12/min, 120/day) and a global daily cap (3,000) — all configurable in `.env`.
  These are in memory; if you run several server instances, move them to Redis.
* Security headers, streaming aborts when the visitor closes the chat, friendly fallbacks
  (offline / busy / rate-limited) that always include contact details.
* Conversations are stored only in the visitor's browser (localStorage); the server keeps no transcripts.
  Server logs record token counts and timing, not message text.

## Cost

Default model `claude-haiku-5-5`. Each answer sends ~3k tokens of (mostly cached) knowledge plus the
conversation and returns ≤700 tokens. Switch to `CHAT_MODEL=claude-sonnet-5-5` for more nuanced answers
at higher cost. Current prices: https://platform.claude.com/docs/en/models/overview

## Chat widget

`src/components/chat/` — floating button, suggested questions, streaming replies with typing indicator,
stop / retry, follow-up suggestions, "Book a free strategy call" shortcut, conversation history (on-device),
full-screen sheet on phones, keyboard support (Enter to send, Shift+Enter for a new line, Esc to close).
Open it from anywhere with:
`window.dispatchEvent(new CustomEvent('m360:open-chat', { detail: { prompt: 'Optional question' } }))`.

## Motion layer (`src/motion/`)

Everything except the Hero and "Ready to Grow" sections. Effects are switched on with data attributes,
so section markup stays readable:

| Attribute / file | Effect |
|---|---|
| `data-reveal="card" \| "head" \| "line" \| "left"` | Entrance styles (cards rise and settle, headings rise word by word, rules draw in) |
| `data-tilt="6"` | 3D tilt toward the pointer (max degrees) |
| `data-spot` | Spotlight that follows the pointer |
| `data-magnetic="0.3"` | Element drifts toward the pointer |
| `data-cursor="Label"` | Custom cursor turns into a labelled disc |
| `data-parallax="0.15"` / `data-progress` | Scroll-linked drift / progress value (`--p`) |
| `ParticleSphere.jsx` | Interactive 3D dotted sphere in the Growth Strategy card |
| `NeuralField.jsx` | Neural-network field behind the Margam AI section |
| `Sparkline.jsx`, `AnimatedValue.jsx` | Console chart (hover for values) and count-up figures |

Performance: one shared animation loop (`engine.js`) that only runs while something visible is moving;
canvases pause off-screen; scroll effects sleep when scrolling stops. The cursor, magnetic and tilt
effects only load on devices with a mouse. Everything is disabled for visitors who set "reduce motion".

## Other files

| File | What it does |
|---|---|
| `src/data/content.js` | All website copy |
| `src/components/Globe.jsx` / `FlightPath.jsx` | Hero globe and jet |
| `src/styles.css` | Design tokens (brand red `#e5261f`, near-black `#0a0a0a`) |
| `npm run build:single` | One self-contained HTML file (used for the claude.ai preview, where the chat runs on the viewer's Claude account instead of your server) |

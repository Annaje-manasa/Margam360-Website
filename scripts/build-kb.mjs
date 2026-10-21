// Turns the website's own copy (src/data/content.js) into a knowledge document,
// so the chatbot always knows exactly what the live React site says.
// Runs automatically before `npm run build` and `npm start`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from '../src/data/content.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'knowledge/generated/website.md');

const lines = [
  '---',
  'url: https://margam360.com/',
  'title: Margam360 website — current page copy',
  'source: website',
  '---',
  '',
  '# Margam360 website (current copy)',
  '',
  'Margam360 is Hyderabad’s performance marketing agency. It engineers compounding growth for ambitious brands across India and the US — an AI-powered 360° marketing partner, from strategy to scale.',
  '',
  '## Headline results',
  ...C.HERO_STATS.map((s) => `- ${s.value}${s.suffix} — ${s.label}`),
  '',
  '## Services and the outcome each one targets',
  ...C.SERVICES.map((s) => `- ${s.title} — ${s.outcome} ${s.outcomeLabel}. ${s.body}`),
  '',
  '## Margam AI (how Margam360 uses AI)',
  ...C.AI_FEATURES.map((f) => `- ${f.title} — ${f.body}`),
  '',
  '## Process',
  ...C.PROCESS.map((p) => `${Number(p.no)}. ${p.title} — ${p.body}`),
  '',
  '## Why Margam360',
  ...C.WHY.map((w) => `- ${w.title} — ${w.body}`),
  '',
  '## Client testimonials',
  ...C.TESTIMONIALS.map((t) => `- “${t.quote}” — ${t.name} (${t.meta})`),
  '',
  '## Free strategy call bonuses',
  ...C.BONUSES.map((b) => `- ${b.title} — ${b.body}`),
  '',
  '## Contact',
  `- Email: ${C.CONTACT.email}`,
  `- Phone / WhatsApp: ${C.CONTACT.phone}`,
  `- Office: ${C.CONTACT.address}`,
  `- Hours: ${C.CONTACT.hours}`,
  '- To book: use the “Book a call” button or the booking form in the “Book your free 30-min growth call” section of the website.',
  '',
];

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join('\n'));
console.log(`knowledge: wrote ${path.relative(root, out)}`);

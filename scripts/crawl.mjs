// Crawl margam360.com into knowledge/crawled/*.md for the chatbot.
//
//   npm run crawl                      # uses knowledge/crawl.config.json
//   SITE_URL=https://staging.example npm run crawl
//
// Discovers pages from the sitemap (WordPress wp-sitemap.xml / Yoast sitemap_index.xml),
// plus any `extraUrls`, then keeps only pages that pass the quality filters
// (include/exclude patterns, minimum words, and a lorem-ipsum / theme-demo detector)
// so placeholder content never reaches the bot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'knowledge/crawl.config.json'), 'utf8'));
const SITE = (process.env.SITE_URL || cfg.siteUrl).replace(/\/$/, '');
const OUT = path.join(root, 'knowledge/crawled');
const UA = 'Margam360-KnowledgeBot/1.0 (+https://margam360.com)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function discover() {
  const urls = new Set();
  const queue = (cfg.sitemaps || ['/wp-sitemap.xml', '/sitemap_index.xml', '/sitemap.xml']).map((s) => SITE + s);
  const seen = new Set();
  while (queue.length) {
    const sm = queue.shift();
    if (seen.has(sm)) continue;
    seen.add(sm);
    let xml;
    try { xml = await get(sm); } catch { continue; }
    const $ = cheerio.load(xml, { xmlMode: true });
    $('sitemap > loc').each((_, el) => queue.push($(el).text().trim()));
    $('url > loc').each((_, el) => urls.add($(el).text().trim()));
  }
  (cfg.extraUrls || []).forEach((u) => urls.add(u.startsWith('http') ? u : SITE + u));
  if (!urls.size) urls.add(SITE + '/');
  return [...urls];
}

const re = (list) => (list || []).map((p) => new RegExp(p, 'i'));
const INCLUDE = re(cfg.include);
const EXCLUDE = re(cfg.exclude);
const LOREM = /\b(lorem|ipsum|dolor sit|consectetur|adipiscing|vestibulum|curabitur|donec|vivamus|nullam|pellentesque)\b/gi;

function extract(html, url) {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg, iframe, form, nav, header, footer, .elementor-location-header, .elementor-location-footer, [aria-hidden="true"]').remove();
  const title = ($('meta[property="og:title"]').attr('content') || $('title').text() || url).trim();
  const scope = $(cfg.contentSelector || 'main, article, .entry-content, body').first();
  const lines = [];
  scope.find('h1, h2, h3, h4, p, li, blockquote, td').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const t = $(el).clone().children('ul,ol').remove().end().text().replace(/\s+/g, ' ').trim();
    if (!t || t.length < 2) return;
    if (/^h[1-4]$/.test(tag)) lines.push(`\n${'#'.repeat(Math.min(3, Number(tag[1])))} ${t}\n`);
    else if (tag === 'li') lines.push(`- ${t}`);
    else lines.push(`${t}\n`);
  });
  // de-duplicate repeated blocks (sliders, marquees)
  const seen = new Set();
  const body = lines.filter((l) => { const k = l.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { title, body };
}

function quality(body) {
  const words = body.split(/\s+/).filter(Boolean).length;
  const lorem = (body.match(LOREM) || []).length;
  if (words < (cfg.minWords ?? 60)) return `thin (${words} words)`;
  if (lorem >= 3 || lorem / words > 0.005) return `placeholder text (${lorem} lorem markers)`;
  return null;
}

const fileFor = (url) => {
  const p = new URL(url).pathname.replace(/^\/|\/$/g, '') || 'home';
  return p.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.md';
};

const urls = (await discover()).filter((u) =>
  u.startsWith(SITE) && (!INCLUDE.length || INCLUDE.some((r) => r.test(u))) && !EXCLUDE.some((r) => r.test(u)));

console.log(`crawl: ${urls.length} candidate pages from ${SITE}`);
fs.mkdirSync(OUT, { recursive: true });
const kept = new Set();
for (const url of urls) {
  try {
    const { title, body } = extract(await get(url), url);
    const why = quality(body);
    if (why) { console.log(`  skip  ${url}  — ${why}`); continue; }
    const file = fileFor(url);
    fs.writeFileSync(path.join(OUT, file), `---\nurl: ${url}\ntitle: ${title.replace(/\n/g, ' ')}\nsource: crawl\ncrawled: ${new Date().toISOString()}\n---\n\n${body}\n`);
    kept.add(file);
    console.log(`  keep  ${url}  → crawled/${file}`);
  } catch (e) {
    console.log(`  fail  ${url}  — ${e.message}`);
  }
  await sleep(cfg.delayMs ?? 400);
}
// remove pages that disappeared or no longer pass the filters
if (kept.size) {
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.md') && !kept.has(f)) { fs.unlinkSync(path.join(OUT, f)); console.log(`  prune crawled/${f}`); }
}
console.log(`crawl: kept ${kept.size} page(s). Restart the server to load them.`);

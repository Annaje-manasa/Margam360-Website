// Minimal, safe Markdown → React (no innerHTML). Supports paragraphs, bullet and
// numbered lists, **bold**, *italic*, `code`, [links](https://…), and bare
// emails / phone numbers / URLs. Unsafe link schemes are rendered as text.
import { Fragment } from 'react';

const SAFE = /^(https?:\/\/|mailto:|tel:|#)/i;
const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\+\d[\d\s-]{8,}\d)/g;

function inline(text, keyBase) {
  const out = [];
  let last = 0, m, k = 0;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const key = `${keyBase}-${k++}`;
    if (t.startsWith('**')) out.push(<strong key={key}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={key}>{t.slice(1, -1)}</code>);
    else if (t.startsWith('*')) out.push(<em key={key}>{t.slice(1, -1)}</em>);
    else if (t.startsWith('[')) {
      const [, label, href] = t.match(/\[([^\]]+)\]\(([^)\s]+)\)/);
      out.push(SAFE.test(href) ? <Link key={key} href={href}>{label}</Link> : label);
    } else if (/^https?:/i.test(t)) out.push(<Link key={key} href={t}>{t.replace(/^https?:\/\//, '')}</Link>);
    else if (t.includes('@')) out.push(<Link key={key} href={`mailto:${t}`}>{t}</Link>);
    else out.push(<Link key={key} href={`tel:${t.replace(/[^\d+]/g, '')}`}>{t}</Link>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Link({ href, children }) {
  const internal = href.startsWith('#');
  return (
    <a href={href} {...(internal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      onClick={internal ? () => window.dispatchEvent(new CustomEvent('m360:chat-navigate')) : undefined}>
      {children}
    </a>
  );
}

export default function Markdown({ text }) {
  const blocks = [];
  const lines = text.replace(/\r/g, '').split('\n');
  let list = null, para = [];
  const flushPara = () => { if (para.length) { blocks.push({ t: 'p', lines: para }); para = []; } };
  const flushList = () => { if (list) { blocks.push(list); list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const ul = line.match(/^\s*[-*•]\s+(.*)/);
    const ol = line.match(/^\s*(\d+)[.)]\s+(.*)/);
    if (ul || ol) {
      flushPara();
      const type = ul ? 'ul' : 'ol';
      if (!list || list.t !== type) { flushList(); list = { t: type, items: [] }; }
      list.items.push(ul ? ul[1] : ol[2]);
    } else if (!line.trim()) { flushPara(); flushList(); }
    else {
      flushList();
      para.push(line.replace(/^#{1,6}\s+/, ''));
    }
  }
  flushPara(); flushList();

  return blocks.map((b, i) => {
    if (b.t === 'p') return <p key={i}>{b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l, `${i}-${j}`)}</Fragment>)}</p>;
    const Tag = b.t;
    return <Tag key={i}>{b.items.map((it, j) => <li key={j}>{inline(it, `${i}-${j}`)}</li>)}</Tag>;
  });
}

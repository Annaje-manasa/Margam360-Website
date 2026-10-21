import { useEffect, useRef, useState } from 'react';
import Logo from './Logo.jsx';
import AnimatedValue from '../motion/AnimatedValue.jsx';
import ParticleSphere from '../motion/ParticleSphere.jsx';
import NeuralField from '../motion/NeuralField.jsx';
import AiFeatureBadge3D from '../motion/AiFeatureBadge3D.jsx';
import Sparkline from '../motion/Sparkline.jsx';
import { SplitWords, ScrollWords, SplitLetters, countWords } from '../motion/text.jsx';
import { env, whileVisible, clamp } from '../motion/engine.js';
import CardGlobe3D from '../motion/CardGlobe3D.jsx';
import { MiniChartSelector } from '../motion/MiniCharts.jsx';
import {
  MARQUEE, SERVICES, AI_FEATURES, PROCESS, WHY, TESTIMONIALS, BONUSES, CONTACT, NAV,
} from '../data/content.js';
import processIllustration from '../assets/process-illustration.png';
import iconDiscover from '../assets/icon-discover.png';
import iconStrategize from '../assets/icon-strategize.png';
import iconLaunch from '../assets/icon-launch.png';
import iconScale from '../assets/icon-scale.png';

const PROCESS_ICONS = [
  iconDiscover,
  iconStrategize,
  iconLaunch,
  iconScale,
];

const ServiceIcon = ({ icon }) => {
  switch (icon) {
    case 'plus':
    case 'star':
      return <span className="svc-icon-badge">✦</span>;
    case 'barChart':
      return (
        <span className="svc-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </span>
      );
    case 'search':
      return (
        <span className="svc-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
      );
    case 'rocket':
      return (
        <span className="svc-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.71 1.26-1.5 1.55-2.32a9.7 9.7 0 0 1-4.55-4.55c-.82.29-1.61.84-2.32 1.55z" />
            <path d="M12 15l-3-3m3 3l5-5m-5 5v-4m-3 3h4m6-12a9 9 0 0 0-9 9c0 1.49.36 2.9.99 4.14L15 12l4-4 3.14-3.14A9 9 0 0 0 18 3z" />
          </svg>
        </span>
      );
    case 'mail':
      return (
        <span className="svc-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </span>
      );
    case 'share':
      return (
        <span className="svc-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </span>
      );
    case 'message':
      return (
        <span className="svc-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </span>
      );
    default:
      return <span className="svc-arrow" aria-hidden="true">↗</span>;
  }
};

const SectionHead = ({ eyebrow, title, accent, after = '', lead, center }) => {
  const a = countWords(title), b = countWords(accent);
  return (
    <div className={`section-head ${center ? 'center' : ''}`} data-reveal="head">
      <p className="eyebrow">{eyebrow}</p>
      <h2 aria-label={`${title} ${accent}${after}`.replace(/\s+/g, ' ')}>
        <SplitWords text={title} /> <em><SplitWords text={accent} start={a} /></em><SplitWords text={after} start={a + b} />
      </h2>
      {lead && <p className="lead">{lead}</p>}
    </div>
  );
};

/** Hairline that draws in at the top of a section. */
const SectionLine = () => <div className="sec-line" data-reveal="line" aria-hidden="true" />;

/* ---------------- Marquee ---------------- */
export function Marquee() {
  const items = [...MARQUEE, ...MARQUEE];
  const track = useRef(null);
  useEffect(() => {
    if (env.reduced) return;
    const el = track.current;
    let x = 0, skew = 0;
    return whileVisible(el, (st, dt) => {
      const half = el.scrollWidth / 2;
      const v = st.velocity;
      x -= (60 + Math.min(900, Math.abs(v) * 28)) * dt * (v < -0.5 ? -1 : 1);
      if (x <= -half) x += half; else if (x > 0) x -= half;
      skew += (clamp(-v * 0.35, -7, 7) - skew) * 0.12;
      el.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
    });
  }, []);
  return (
    <div className="marquee" aria-label="Services">
      <div className="marquee-track" ref={track}>
        {items.map((m, i) => (
          <span key={i} aria-hidden={i >= MARQUEE.length}>
            {m}<b aria-hidden="true">✦</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Services ---------------- */
export function Services() {
  return (
    <section className="section" id="services">
      <div className="container">
        <SectionHead
          eyebrow="What you’ll gain"
          title="Outcome-"
          accent="driven"
          after=" services."
          lead="Every service is tied to a measurable outcome. No vanity metrics. No jargon. Just results that compound month after month."
        />
        <div className="bento">
          {SERVICES.map((s, i) => (
            <article
              key={s.title}
              className={`card svc ${s.featured ? 'svc-featured' : ''}`}
              data-reveal="card"
              data-tilt={s.featured ? '4' : '6'}
              data-spot
              style={{ '--d': `${i * 70}ms` }}
            >
              <div className="svc-top">
                <span className="svc-no">{s.no}</span>
                <ServiceIcon icon={s.icon} />
              </div>
              {s.featured && <CardGlobe3D className="svc-featured-globe" />}
              <h3>{s.title}</h3>
              <p className="svc-body">{s.body}</p>
              {!s.featured && (
                <div className="svc-mini-graphic">
                  <MiniChartSelector no={s.no} />
                </div>
              )}
              <div className="svc-outcome">
                <strong><AnimatedValue value={s.outcome} delay={i * 70} /></strong>
                <span>{s.outcomeLabel}</span>
              </div>
            </article>
          ))}
          <a href="#booking" className="card svc svc-cta" data-reveal="card" data-spot data-cursor="Book" style={{ '--d': '490ms' }}>
            <p className="eyebrow">Not sure where to start?</p>
            <h3>Get a free brand audit — we’ll tell you which lever moves revenue first.</h3>
            <span className="btn-link">Book the audit <span aria-hidden="true">→</span></span>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Margam AI ---------------- */
const INSIGHTS = [
  'Shifting 18% budget from Reels → Search: intent spike detected',
  'Variant C hook outperforms control by 2.4X on CTR',
  'WhatsApp re-engagement flow recovered 112 carts this week',
  'Top-3 ranking reached for 6 priority keywords',
];
const CHANNELS = [
  { name: 'Google Search', base: 78 },
  { name: 'Meta Ads', base: 64 },
  { name: 'WhatsApp', base: 52 },
  { name: 'SEO', base: 70 },
  { name: 'Email', base: 41 },
];

const LEADS = [612, 655, 701, 690, 760, 812, 870, 905, 980, 1050, 1150, 1284];

function Console() {
  const [tick, setTick] = useState(0);
  const [typed, setTyped] = useState('');
  const ref = useRef(null);
  const [inView, setInView] = useState(true);
  const line = INSIGHTS[tick % INSIGHTS.length];

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setTyped(line); return; }
    let i = 0;
    setTyped('');
    const t = setInterval(() => {
      i++;
      setTyped(line.slice(0, i));
      if (i >= line.length) clearInterval(t);
    }, 24);
    const next = setTimeout(() => setTick((v) => v + 1), 4200);
    return () => { clearInterval(t); clearTimeout(next); };
  }, [line]);

  return (
    <div className="console is-live" data-tilt="3" ref={ref}>
      <div className="console-bar">
        <span className="dots"><i /><i /><i /></span>
        <span className="console-title">Margam AI · Growth Console</span>
        <span className="console-live"><span className="live-dot" /> Live</span>
      </div>
      <div className="console-body">
        <div className="console-kpis">
          <div><small>ROAS</small><strong><AnimatedValue value="4.8x" /></strong><em>+0.6</em></div>
          <div><small>CPA</small><strong><AnimatedValue value="₹212" delay={120} /></strong><em>−38%</em></div>
          <div><small>Leads / wk</small><strong><AnimatedValue value="1,284" delay={240} /></strong><em>+3.1x</em></div>
        </div>
        <Sparkline data={LEADS} />
        <div className="console-chart">
          {CHANNELS.map((c, i) => {
            const w = Math.min(96, c.base + Math.sin(tick * 1.7 + i * 1.3) * 12);
            return (
              <div className="bar-row" key={c.name}>
                <span>{c.name}</span>
                <div className="bar"><i style={{ width: inView ? `${w}%` : '0%', transitionDelay: tick ? '0ms' : `${200 + i * 90}ms` }} /></div>
                <b>{inView ? Math.round(w) : 0}</b>
              </div>
            );
          })}
        </div>
        <div className="console-insight">
          <span className="spark" aria-hidden="true">✦</span>
          <p>{typed}<span className="caret" aria-hidden="true" /></p>
        </div>
      </div>
      <p className="console-note">Illustrative dashboard</p>
    </div>
  );
}

export function AIEngine() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  useEffect(() => {
    if (hoveredIdx !== null) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % AI_FEATURES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [hoveredIdx]);

  const currentIdx = hoveredIdx !== null ? hoveredIdx : activeIdx;

  return (
    <section className="section ai" id="ai">
      <NeuralField />
      <div className="ai-glow" aria-hidden="true" data-parallax="0.18" />
      <div className="container ai-grid">
        <div>
          <SectionHead
            eyebrow="Margam AI"
            title="An AI-native"
            accent="growth engine."
            lead="Strategists set the direction. Our AI layer does the heavy lifting — reading signals across every channel and moving budget, creative and messaging toward what will convert next."
          />
          <button type="button" className="btn btn-primary ai-ask" data-reveal data-magnetic data-cursor="Ask AI" onClick={() => window.dispatchEvent(new CustomEvent('m360:open-chat', { detail: { prompt: 'How does Margam360 use AI to grow revenue?' } }))}>
            Ask Margam AI a question
          </button>
          <ul className="ai-features" onMouseLeave={() => setHoveredIdx(null)}>
            {AI_FEATURES.map((f, i) => {
              const isActive = currentIdx === i;
              return (
                <li
                  key={f.title}
                  className={`is-in ${isActive ? 'is-active' : ''}`}
                  data-reveal="line"
                  style={{ '--d': `${i * 90}ms` }}
                  onMouseEnter={() => {
                    setHoveredIdx(i);
                    setActiveIdx(i);
                  }}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <AiFeatureBadge3D index={i} label={`0${i + 1}`} isActive={isActive} />
                  <div>
                    <h3>{f.title}</h3>
                    <p>{f.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <Console />
      </div>
    </section>
  );
}

/* ---------------- Process ---------------- */
export function Process() {
  const list = useRef(null);
  const [lit, setLit] = useState(3); // All 4 cards lit in matching red neon style
  const [hoveredIdx, setHoveredIdx] = useState(null);

  useEffect(() => {
    if (env.reduced) return;
    const el = list.current;
    if (!el) return;
    let last = -2;
    return whileVisible(el, (st) => {
      const r = el.getBoundingClientRect();
      const p = clamp((st.vh * 0.78 - r.top) / (st.vh * 0.5 + r.height * 0.4));
      const n = p <= 0.05 ? 3 : Math.min(PROCESS.length - 1, Math.floor(p * PROCESS.length * 0.999 + 0.3));
      if (n !== last) { last = n; setLit(n); }
    });
  }, []);

  return (
    <section className="section proc-section" id="process">
      <div className="container">
        <SectionLine />
        <div className="proc-layout">
          {/* Left Column */}
          <div className="proc-left" data-reveal>
            <div className="proc-eyebrow">
              <span className="proc-eyebrow-dash" aria-hidden="true" />
              <span>HOW WE WORK</span>
            </div>
            <h2 className="proc-heading">
              Our process.<br />
              <span className="proc-heading-accent">Proven.</span>
            </h2>
            <p className="proc-lead">
              A simple, strategic process designed to turn your goals into measurable growth.
            </p>
            <div className="proc-graphic-box">
              <img
                src={processIllustration}
                alt="Strategic growth dashboard and 3D target"
                className="proc-graphic-img"
                loading="lazy"
              />
            </div>
          </div>

          {/* Right Column Timeline */}
          <div className="proc-timeline" ref={list} onMouseLeave={() => setHoveredIdx(null)}>
            {/* Wavy Neon Spine SVG */}
            <div className="proc-spine-wrap" aria-hidden="true">
              <svg className="proc-spine-svg" viewBox="0 0 120 470" preserveAspectRatio="none">
                <defs>
                  <filter id="proc-neon-glow" x="-40%" y="-20%" width="180%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur1" />
                    <feGaussianBlur stdDeviation="12" result="blur2" />
                    <feMerge>
                      <feMergeNode in="blur2" />
                      <feMergeNode in="blur1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="proc-spine-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff5548" stopOpacity="0.95" />
                    <stop offset="50%" stopColor="#e5261f" stopOpacity="0.92" />
                    <stop offset="100%" stopColor="#ff4a3d" stopOpacity="0.9" />
                  </linearGradient>
                </defs>
                {/* Ambient glow stroke */}
                <path
                  className="proc-spine-glow"
                  d="M 78,0 C 80,20 80,35 80,52 C 80,105 24,120 48,174 C 62,225 2,245 16,296 C 8,345 15,380 62,418 C 76,435 78,455 76,470"
                  fill="none"
                  stroke="rgba(229, 38, 31, 0.55)"
                  strokeWidth="10"
                  filter="url(#proc-neon-glow)"
                />
                {/* Bright core stroke */}
                <path
                  className="proc-spine-base"
                  d="M 78,0 C 80,20 80,35 80,52 C 80,105 24,120 48,174 C 62,225 2,245 16,296 C 8,345 15,380 62,418 C 76,435 78,455 76,470"
                  fill="none"
                  stroke="url(#proc-spine-grad)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                {/* Flowing laser stream pulse */}
                <path
                  className="proc-spine-stream"
                  d="M 78,0 C 80,20 80,35 80,52 C 80,105 24,120 48,174 C 62,225 2,245 16,296 C 8,345 15,380 62,418 C 76,435 78,455 76,470"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="proc-cards-list">
              {PROCESS.map((p, i) => {
                const isLit = hoveredIdx !== null ? (i <= hoveredIdx) : (i <= lit);
                return (
                  <div
                    key={p.no}
                    className={`proc-v-row proc-row-${i} ${isLit ? 'is-lit' : ''}`}
                    data-reveal
                    style={{ '--d': `${i * 90}ms`, '--step': i }}
                    onMouseEnter={() => setHoveredIdx(i)}
                  >
                    <div className="proc-v-node-wrap">
                      <div className={`proc-v-node ${isLit ? 'is-lit' : ''}`}>
                        <span>{p.no}</span>
                      </div>
                      <span className={`proc-v-connector ${isLit ? 'is-lit' : ''}`} />
                    </div>
                    <div className={`proc-v-card ${isLit ? 'is-lit' : ''}`}>
                      <div className="proc-v-icon-wrap">
                        <img src={PROCESS_ICONS[i]} alt={p.title} className="proc-v-icon-img" width="72" height="72" />
                      </div>
                      <div className="proc-v-text">
                        <h3>{p.title}</h3>
                        <p>{p.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const WhyIcon = ({ title }) => {
  switch (title) {
    case 'Objectives first':
      return (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="1" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="23" />
          <line x1="1" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="23" y2="12" />
        </svg>
      );
    case 'Excellence always':
      return (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8.5" r="5.5" />
          <polyline points="8.21 13.89 7 21.5 12 18.5 17 21.5 15.79 13.88" />
        </svg>
      );
    case 'Highest success rate':
      return (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case 'Small team, big results':
      return (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
  }
};

/* ---------------- Why us ---------------- */
export function WhyUs() {
  return (
    <section className="section" id="why">
      <div className="container"><SectionLine /></div>
      <div className="container why-grid">
        <div className="why-intro">
          <SectionHead
            eyebrow="Why Margam360"
            title="Why brands"
            accent="choose us."
            lead="We’re not another agency that promises the moon and delivers mediocre results. We’re your strategic growth partner — accountable, transparent, and obsessed with your success."
          />
          <a href="#booking" className="btn-link" data-reveal data-magnetic="0.25">Talk to our team <span aria-hidden="true">→</span></a>
        </div>
        <div className="why-cards">
          {WHY.map((w, i) => (
            <div className="card why-card" key={w.title} data-reveal="card" data-tilt="4" data-spot style={{ '--d': `${i * 80}ms` }}>
              <span className="why-check" aria-hidden="true">
                <WhyIcon title={w.title} />
              </span>
              <h3>{w.title}</h3>
              <p>{w.body}</p>
            </div>
          ))}
          <div className="card why-card why-statement" data-reveal="card" data-tilt="2" data-spot style={{ '--d': '320ms' }}>
            <h3>Zero junk business.</h3>
            <p>We turn down clients we can’t genuinely help. We chase quality outcomes — never vanity metrics or inflated reports. Your growth is our reputation.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Testimonials ---------------- */
export function Testimonials() {
  return (
    <section className="section" id="results">
      <div className="container">
        <SectionLine />
        <SectionHead eyebrow="Client results" title="Stories of" accent="transformation." center />
        <div className="quotes">
          {TESTIMONIALS.map((t, i) => (
            <figure className="card quote" key={t.name} data-reveal="card" data-tilt="3" data-spot style={{ '--d': `${i * 120}ms` }}>
              <span className="quote-glyph" aria-hidden="true" data-parallax="-0.05">“</span>
              <span className="quote-metric">{t.metric}</span>
              <ScrollWords as="blockquote" text={`“${t.quote}”`} />
              <figcaption>
                <span className="avatar" aria-hidden="true">{t.name[0]}</span>
                <span>
                  <strong>{t.name}</strong>
                  <small>{t.meta}</small>
                </span>
                <span className="stars" aria-label="5 out of 5">★★★★★</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Booking ---------------- */
export function Booking() {
  const [request, setRequest] = useState(null);
  const [copied, setCopied] = useState(false);
  const onSubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    // TODO: post to your CRM / Formspree / Google Sheet webhook here.
    // Until a backend is wired up, the visitor gets a ready-to-send summary.
    setRequest([...f.entries()].filter(([, v]) => String(v).trim()).map(([k, v]) => `${k}: ${v}`).join('\n'));
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(request); setCopied(true); }
    catch { const r = document.createRange(); r.selectNodeContents(document.querySelector('.form-summary')); getSelection().removeAllRanges(); getSelection().addRange(r); }
  };
  return (
    <section className="section" id="booking">
      <div className="container"><SectionLine /></div>
      <div className="container booking">
        <div className="booking-copy">
          <SectionHead
            eyebrow="Free strategy session"
            title="Book your"
            accent="free"
            after=" 30-min growth call."
            lead="No pitch. No pressure. A focused 30 minutes where we map out exactly how to grow your revenue — and you keep the plan either way."
          />
          <ul className="bonuses">
            {BONUSES.map((b, i) => (
              <li key={b.title} data-reveal="left" style={{ '--d': `${i * 110}ms` }}>
                <span className="bonus-ico" aria-hidden="true" style={{ '--si': i }}>✦</span>
                <div><strong>{b.title}</strong><p>{b.body}</p></div>
              </li>
            ))}
          </ul>
          <dl className="contact-list" data-reveal>
            <div><dt>Email</dt><dd><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></dd></div>
            <div><dt>Call</dt><dd><a href={CONTACT.phoneHref}>{CONTACT.phone}</a></dd></div>
            <div><dt>Office</dt><dd>{CONTACT.address}</dd></div>
            <div><dt>Hours</dt><dd>{CONTACT.hours}</dd></div>
          </dl>
        </div>

        {request ? (
          <div className="card form form-done" aria-live="polite">
            <p className="eyebrow">Almost there</p>
            <h3>Your request is ready to send.</h3>
            <p>Send it on WhatsApp or email it to <strong>{CONTACT.email}</strong> and the team will confirm a slot within one business day.</p>
            <pre className="form-summary">{request}</pre>
            <div className="form-actions">
              <a className="btn btn-wa" href={`${CONTACT.whatsapp}?text=${encodeURIComponent('Hi Margam360, I’d like a free strategy call.\n\n' + request)}`} target="_blank" rel="noreferrer">Send on WhatsApp</a>
              <button type="button" className="btn btn-ghost" onClick={copy}>{copied ? 'Copied' : 'Copy details'}</button>
            </div>
            <button type="button" className="link-plain" onClick={() => { setRequest(null); setCopied(false); }}>Edit details</button>
          </div>
        ) : (
        <form className="card form beam" onSubmit={onSubmit} data-reveal="card">
          <h3>Pick a time that works.</h3>
          <p className="form-sub">30 minutes, zero pressure. We reply within one business day.</p>
          <div className="field-row">
            <label className="field"><span>Name</span><input id="f-name" name="Name" required autoComplete="name" /></label>
            <label className="field"><span>Phone / WhatsApp</span><input id="f-phone" name="Phone" required inputMode="tel" autoComplete="tel" /></label>
          </div>
          <label className="field"><span>Work email</span><input id="f-email" name="Email" type="email" required autoComplete="email" /></label>
          <label className="field"><span>Website or Instagram</span><input id="f-website" name="Website" placeholder="yourbrand.com" /></label>
          <div className="field">
            <span>Monthly marketing budget</span>
            <div className="chips" role="radiogroup">
              {['< ₹1L', '₹1–3L', '₹3–10L', '₹10L+'].map((b, i) => (
                <label key={b} className="chip">
                  <input type="radio" name="Budget" value={b} defaultChecked={i === 1} />
                  <span>{b}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="field"><span>What’s the #1 growth goal?</span><textarea id="f-goal" name="Goal" rows="3" /></label>
          <button className="btn btn-primary btn-block" type="submit" data-magnetic="0.12">Book my free call</button>
        </form>
        )}
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */
export function FinalCTA() {
  return (
    <section className="final">
      <div className="container final-inner" data-reveal>
        <p className="eyebrow">Ready to grow?</p>
        <h2>Every day you wait is revenue <em>left behind.</em></h2>
        <p className="lead">Join the brands that chose Margam360 as their growth partner. Your free strategy call is one click away.</p>
        <a href="#booking" className="btn btn-primary">Book my free call now</a>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>Driving digital growth with strategy, creativity and integrity. Hyderabad, Telangana, India.</p>
        </div>
        <div>
          <h4>Explore</h4>
          <ul>{NAV.map((n) => <li key={n.href}><a href={n.href}>{n.label}</a></li>)}</ul>
        </div>
        <div>
          <h4>Services</h4>
          <ul>{SERVICES.slice(1).map((s) => <li key={s.title}><a href="#services">{s.title}</a></li>)}</ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
            <li><a href={CONTACT.phoneHref}>{CONTACT.phone}</a></li>
            <li>{CONTACT.address}</li>
            <li>{CONTACT.hours}</li>
          </ul>
        </div>
      </div>
      <div className="container footer-base">
        <span>© {new Date().getFullYear()} Margam360. A product of Dekonda Marketing Solutions. All rights reserved.</span>
        <span className="socials">
          <a href="#" aria-label="Instagram" data-magnetic="0.4">IG</a>
          <a href="#" aria-label="LinkedIn" data-magnetic="0.4">IN</a>
          <a href="#" aria-label="Facebook" data-magnetic="0.4">FB</a>
          <a href="#" aria-label="X" data-magnetic="0.4">X</a>
        </span>
      </div>
      <SplitLetters text="Margam360" className="footer-mega" />
    </footer>
  );
}

/* ---------------- WhatsApp float ---------------- */
export function WhatsAppFab() {
  return (
    <a className="wa-fab" href={CONTACT.whatsapp} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
      <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
        <path fill="currentColor" d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.2.6 4.4 1.7 6.3L3 29l7.3-1.9c1.8 1 3.8 1.5 5.8 1.5 7 0 12.7-5.6 12.7-12.6S23 3 16 3zm0 23.1c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-4.3 1.1 1.2-4.2-.3-.4c-1-1.6-1.5-3.5-1.5-5.4C5.4 9.8 10.1 5.1 16 5.1s10.6 4.7 10.6 10.5S21.9 26.1 16 26.1zm5.8-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.6-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.7 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z" />
      </svg>
    </a>
  );
}

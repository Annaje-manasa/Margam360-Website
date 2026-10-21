// Counts the number inside a display string up from zero when it scrolls into view,
// keeping its prefix/suffix and formatting: "−40%", "+100%", "Top 3", "₹212", "1,284", "4.8x".
import { useEffect, useRef, useState } from 'react';
import { env } from './engine.js';

function parse(str) {
  const m = String(str).match(/^(.*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const raw = m[2];
  return {
    prefix: m[1],
    suffix: m[3],
    value: parseFloat(raw.replace(/,/g, '')),
    decimals: raw.includes('.') ? raw.split('.')[1].length : 0,
    grouped: raw.includes(','),
  };
}

const fmt = (n, p) => {
  const s = n.toFixed(p.decimals);
  return p.grouped ? Number(s).toLocaleString('en-IN', { minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals }) : s;
};

export default function AnimatedValue({ value, duration = 1400, delay = 0 }) {
  const p = parse(value);
  const ref = useRef(null);
  const [shown, setShown] = useState(() => (!p || env.reduced ? null : 0));

  useEffect(() => {
    if (!p || env.reduced) return;
    let raf, t0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const tick = (now) => {
        t0 ??= now + delay;
        const t = Math.min(1, Math.max(0, (now - t0) / duration));
        setShown(p.value * (1 - Math.pow(1 - t, 4)));
        if (t < 1) raf = requestAnimationFrame(tick);
        else setShown(null);
      };
      raf = requestAnimationFrame(tick);
    }, { rootMargin: '100px', threshold: 0.01 });
    io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // `null` = show the exact original string (at rest, reduced motion, or finished)
  return (
    <span ref={ref} className="av" aria-label={value}>
      <span aria-hidden="true">{shown === null || !p ? value : `${p.prefix}${fmt(shown, p)}${p.suffix}`}</span>
    </span>
  );
}

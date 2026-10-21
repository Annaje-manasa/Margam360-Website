// Text motion helpers. Screen readers get the plain text via aria-label;
// the split spans are presentational.
import { useEffect, useRef, useState } from 'react';
import { env } from './engine.js';

/** Words that rise out of a mask, staggered. Animates when an ancestor gets `.is-in`. */
export function SplitWords({ text, start = 0 }) {
  const words = text.split(/(\s+)/);
  let n = start;
  return words.map((w, i) =>
    /\s+/.test(w) || !w ? w : (
      <span className="sw" key={i} aria-hidden="true">
        <span style={{ '--wi': n++ }}>{w}</span>
      </span>
    )
  );
}
export const countWords = (t) => t.split(/\s+/).filter(Boolean).length;

/**
 * A paragraph that "reads itself": words brighten as the block scrolls
 * through the viewport. Driven by --p from MotionLayer (data-progress).
 */
export function ScrollWords({ text, as: Tag = 'p', className = '' }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <Tag className={`scroll-words ${className}`} data-progress style={{ '--n': words.length }} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden="true" style={{ '--i': i }}>{w} </span>
      ))}
    </Tag>
  );
}

/** Letters that rise in sequence once the element is on screen. */
export function SplitLetters({ text, className = '' }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(env.reduced);
  useEffect(() => {
    if (env.reduced) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`${className} split-letters ${inView ? 'is-in' : ''}`} aria-hidden="true">
      {[...text].map((c, i) => <span key={i} style={{ '--li': i }}>{c}</span>)}
    </div>
  );
}

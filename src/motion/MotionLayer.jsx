// Page-wide pointer & scroll effects, wired by data attributes so section
// markup stays clean:
//   data-magnetic[="0.35"]   element drifts toward the pointer
//   data-tilt[="6"]          3D tilt toward the pointer (max degrees)
//   data-spot                spotlight that follows the pointer (--sx/--sy)
//   data-parallax="0.12"     vertical drift with scroll (fraction of distance from centre)
//   data-progress            receives --p (0→1 as it travels through the viewport)
// The Hero and "Ready to Grow" sections are deliberately never touched.
import { useEffect } from 'react';
import { env, onFrame, clamp, viewProgress } from './engine.js';
import Cursor from './Cursor.jsx';

const EXCLUDED = '';

export default function MotionLayer() {
  useEffect(() => {
    if (env.reduced) return;
    const root = document.documentElement;
    root.classList.add('motion-on');
    const cleanups = [];

    /* ---------- magnetic / tilt / spotlight (desktop pointers only) ---------- */
    if (env.fine) {
      let mag = null, tilt = null;
      const release = (el, kind) => {
        if (!el) return;
        if (kind === 'mag') { el.style.translate = ''; el.classList.remove('is-magnet'); }
        else { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); el.classList.remove('is-tilting'); }
      };
      const onMove = (e) => {
        if (e.pointerType !== 'mouse') return;
        const t = e.target instanceof Element ? e.target : null;
        const inExcluded = (EXCLUDED ? t?.closest(EXCLUDED) : null) || root.classList.contains('mc-native');

        const m = inExcluded ? null : t?.closest('[data-magnetic]');
        if (m !== mag) { release(mag, 'mag'); mag = m; }
        if (mag) {
          const r = mag.getBoundingClientRect();
          const k = parseFloat(mag.dataset.magnetic) || 0.3;
          const dx = (e.clientX - (r.left + r.width / 2)) * k;
          const dy = (e.clientY - (r.top + r.height / 2)) * k;
          mag.classList.add('is-magnet');
          mag.style.translate = `${clamp(dx, -14, 14).toFixed(1)}px ${clamp(dy, -10, 10).toFixed(1)}px`;
        }

        const tl = inExcluded ? null : t?.closest('[data-tilt]');
        if (tl !== tilt) { release(tilt, 'tilt'); tilt = tl; }
        if (tilt) {
          const r = tilt.getBoundingClientRect();
          const max = parseFloat(tilt.dataset.tilt) || 6;
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          tilt.classList.add('is-tilting');
          tilt.style.setProperty('--ry', `${(px * max * 2).toFixed(2)}deg`);
          tilt.style.setProperty('--rx', `${(-py * max * 2).toFixed(2)}deg`);
        }

        const sp = inExcluded ? null : t?.closest('[data-spot]');
        if (sp) {
          const r = sp.getBoundingClientRect();
          sp.style.setProperty('--sx', `${e.clientX - r.left}px`);
          sp.style.setProperty('--sy', `${e.clientY - r.top}px`);
        }
      };
      const onLeaveDoc = () => { release(mag, 'mag'); release(tilt, 'tilt'); mag = tilt = null; };
      document.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerleave', onLeaveDoc);
      cleanups.push(() => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeaveDoc); });
    }

    /* ---------- parallax + scroll progress ----------
       Runs only while the page is actually scrolling, and only for elements on screen. */
    const visible = new Set();
    const last = new WeakMap();
    const write = (el, prop, val) => { const k = el.__k || (el.__k = {}); if (k[prop] !== val) { k[prop] = val; prop === 'translate' ? (el.style.translate = val) : el.style.setProperty(prop, val); } };
    const update = (vh) => {
      visible.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (el.dataset.parallax) {
          const k = parseFloat(el.dataset.parallax) * (env.mobile ? 0.5 : 1);
          write(el, 'translate', `0 ${((r.top + r.height / 2 - vh / 2) * k).toFixed(1)}px`);
        }
        if ('progress' in el.dataset) write(el, '--p', viewProgress(r, vh).toFixed(3));
      });
    };
    let stopLoop = null, lastY = -1, quiet = 0;
    const tick = (s, dt) => {
      if (s.scrollY === lastY) { quiet += dt; if (quiet > 0.35) { stopLoop(); stopLoop = null; } return; }
      quiet = 0; lastY = s.scrollY;
      update(s.vh);
    };
    const wake = () => { if (!stopLoop && visible.size) { lastY = -1; stopLoop = onFrame(tick); } };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => (en.isIntersecting ? visible.add(en.target) : visible.delete(en.target)));
      update(window.innerHeight);
    }, { rootMargin: '200px 0px' });
    const tracked = [...document.querySelectorAll('[data-parallax], [data-progress]')].filter((el) => !EXCLUDED || !el.closest(EXCLUDED));
    tracked.forEach((el) => io.observe(el));
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake, { passive: true });
    cleanups.push(() => { io.disconnect(); stopLoop?.(); window.removeEventListener('scroll', wake); window.removeEventListener('resize', wake); void last; });

    return () => { cleanups.forEach((c) => c()); root.classList.remove('motion-on'); };
  }, []);

  return env.fine && !env.reduced ? <Cursor exclude={EXCLUDED} /> : null;
}

// One shared animation loop for every motion effect on the page.
// It only runs while something subscribes (an effect that is on screen),
// so an idle page costs nothing.

const mq = (q) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : false);

export const env = {
  reduced: mq('(prefers-reduced-motion: reduce)'),
  fine: mq('(hover: hover) and (pointer: fine)'),
  mobile: mq('(max-width: 900px)'),
};

export const state = {
  x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
  y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  vw: typeof window !== 'undefined' ? window.innerWidth : 0,
  vh: typeof window !== 'undefined' ? window.innerHeight : 0,
  scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
  velocity: 0, // smoothed scroll velocity, px per frame
  pointerActive: false,
  time: 0,
};

const subs = new Set();
let raf = 0, last = 0, lastScroll = state.scrollY;

function frame(now) {
  const dt = Math.min(0.05, (now - (last || now)) / 1000);
  last = now;
  state.time = now;
  const sy = window.scrollY;
  const raw = sy - lastScroll;
  lastScroll = sy;
  state.scrollY = sy;
  state.velocity += (raw - state.velocity) * 0.18;
  subs.forEach((fn) => fn(state, dt));
  raf = subs.size ? requestAnimationFrame(frame) : 0;
}

export function onFrame(fn) {
  subs.add(fn);
  if (!raf) { last = 0; lastScroll = window.scrollY; raf = requestAnimationFrame(frame); }
  return () => subs.delete(fn);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    state.x = e.clientX; state.y = e.clientY; state.pointerActive = true;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { state.pointerActive = false; });
  window.addEventListener('resize', () => {
    state.vw = window.innerWidth; state.vh = window.innerHeight;
    env.mobile = mq('(max-width: 900px)');
  }, { passive: true });
}

/** Run `fn` every frame only while `el` is on screen. Returns a cleanup. */
export function whileVisible(el, fn, rootMargin = '120px') {
  let off = null;
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !off) off = onFrame(fn);
    else if (!e.isIntersecting && off) { off(); off = null; }
  }, { rootMargin });
  io.observe(el);
  return () => { io.disconnect(); off?.(); };
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** 0 when the element's top enters the bottom of the viewport, 1 when its bottom leaves the top. */
export function viewProgress(rect, vh) {
  return clamp((vh - rect.top) / (vh + rect.height));
}

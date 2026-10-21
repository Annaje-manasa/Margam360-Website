// Contextual cursor: a precise red dot plus a soft trailing ring.
//  · links / buttons      → ring expands around the target
//  · [data-cursor="Label"] → ring becomes a red disc with the label
//  · text fields          → custom cursor steps aside for the native I-beam
//  · Hero & "Ready to Grow" → native cursor (those sections are left exactly as they were)
import { useEffect, useRef } from 'react';
import { state, onFrame, lerp } from './engine.js';

export default function Cursor({ exclude }) {
  const dot = useRef(null);
  const ring = useRef(null);
  const label = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('cursor-on');
    let rx = state.x, ry = state.y, mode = 'idle', text = '', hidden = true, down = false;

    const setMode = (m, t = '') => {
      if (m === mode && t === text) return;
      mode = m; text = t;
      ring.current.dataset.mode = m;
      dot.current.dataset.mode = m;
      label.current.textContent = t;
    };

    // Native cursor whenever the pointer is over the Hero / "Ready to Grow" —
    // including fixed UI (nav, floating buttons) that sits on top of them.
    const overExcluded = (t, e) => (exclude ? (t.closest(exclude)
      || document.elementsFromPoint(e.clientX, e.clientY).some((el) => el.matches(exclude))) : false);
    const onOver = (e) => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      const native = overExcluded(t, e);
      root.classList.toggle('mc-native', !!native);
      if (native) { hidden = true; return setMode('off'); }
      hidden = false;
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return setMode('text');
      const labelled = t.closest('[data-cursor]');
      if (labelled) return setMode('label', labelled.dataset.cursor);
      if (t.closest('a, button, [role="button"], label.chip, summary')) return setMode('hover');
      setMode('idle');
    };
    const onDown = () => { down = true; ring.current.classList.add('is-down'); };
    const onUp = () => { down = false; ring.current.classList.remove('is-down'); };
    const onLeave = () => { hidden = true; wake(); };
    const onEnter = () => { hidden = false; };

    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointerup', onUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.documentElement.addEventListener('pointerenter', onEnter);

    // the loop only runs while the ring is catching up with the pointer
    let off = null;
    const step = (s, dt) => {
      const k = 1 - Math.pow(0.0008, dt); // frame-rate independent easing
      rx = lerp(rx, s.x, k);
      ry = lerp(ry, s.y, k);
      const show = s.pointerActive && !hidden && mode !== 'off';
      dot.current.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
      ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      dot.current.style.opacity = show && mode !== 'text' ? '1' : '0';
      ring.current.style.opacity = show && mode !== 'text' ? '1' : '0';
      void down;
      if (Math.abs(rx - s.x) < 0.15 && Math.abs(ry - s.y) < 0.15 && off) { off(); off = null; }
    };
    const wake = () => { if (!off) off = onFrame(step); };
    window.addEventListener('pointermove', wake, { passive: true });
    document.addEventListener('pointerover', wake, { passive: true });

    return () => {
      off?.();
      window.removeEventListener('pointermove', wake);
      document.removeEventListener('pointerover', wake);
      root.classList.remove('cursor-on', 'mc-native');
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.documentElement.removeEventListener('pointerenter', onEnter);
    };
  }, [exclude]);

  return (
    <div className="mc" aria-hidden="true">
      <div className="mc-ring" ref={ring} data-mode="idle"><span ref={label} /></div>
      <div className="mc-dot" ref={dot} data-mode="idle" />
    </div>
  );
}

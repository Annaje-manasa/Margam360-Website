// Interactive 3D "360°" sphere for the featured Growth Strategy card.
// A Fibonacci dot-sphere (same dotted language as the hero globe) wrapped by
// an inclined orbit with a travelling signal. Drag-free: it leans toward the
// pointer while the card is hovered and spins slowly otherwise.
import { useEffect, useRef } from 'react';
import { env, state, whileVisible, lerp } from './engine.js';

const N = 520;
const PTS = (() => {
  const a = new Float32Array(N * 3), g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = g * i;
    a[i * 3] = Math.cos(t) * r; a[i * 3 + 1] = y; a[i * 3 + 2] = Math.sin(t) * r;
  }
  return a;
})();
const RING = 120;

export default function ParticleSphere({ className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const host = canvas.closest('[data-tilt]') || canvas.parentElement;
    let W = 0, H = 0, dpr = 1;
    let yaw = 0.6, pitch = -0.35, tYaw = 0, tPitch = 0, spin = 0, hover = 0;

    const size = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(canvas);

    const draw = (s, dt) => {
      // pointer → target lean while hovering the card
      const hr = host.getBoundingClientRect();
      const over = env.fine && s.pointerActive && s.x > hr.left && s.x < hr.right && s.y > hr.top && s.y < hr.bottom;
      hover = lerp(hover, over ? 1 : 0, 1 - Math.pow(0.02, dt));
      if (over) {
        tYaw = ((s.x - hr.left) / hr.width - 0.5) * 1.6;
        tPitch = ((s.y - hr.top) / hr.height - 0.5) * 1.0;
      } else { tYaw = 0; tPitch = 0; }
      if (!env.reduced) spin += dt * (0.18 + hover * 0.25);
      yaw = lerp(yaw, spin + tYaw, 1 - Math.pow(0.05, dt));
      pitch = lerp(pitch, -0.35 + tPitch, 1 - Math.pow(0.05, dt));

      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const R = Math.min(W, H) * 0.34, cx = W / 2, cyy = H / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // core glow
      const g = ctx.createRadialGradient(cx, cyy, 0, cx, cyy, R * 1.5);
      g.addColorStop(0, `rgba(229,38,31,${0.22 + hover * 0.12})`);
      g.addColorStop(1, 'rgba(229,38,31,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // sphere dots, depth-shaded
      for (let i = 0; i < N; i++) {
        const x = PTS[i * 3], y = PTS[i * 3 + 1], z = PTS[i * 3 + 2];
        const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
        const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        const depth = (z2 + 1) / 2; // 0 back → 1 front
        const a = 0.08 + depth * depth * 0.85;
        const sz = 0.6 + depth * 1.5;
        ctx.fillStyle = depth > 0.55 ? `rgba(255,240,235,${a})` : `rgba(229,38,31,${a})`;
        ctx.fillRect(cx + x1 * R - sz / 2, cyy - y2 * R - sz / 2, sz, sz);
      }

      // inclined orbit + travelling signal
      const tilt = 0.9;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const head = (s.time / 2600) % 1;
      for (let i = 0; i < RING; i++) {
        const t = (i / RING) * Math.PI * 2;
        let x = Math.cos(t) * 1.45, y = 0, z = Math.sin(t) * 1.45;
        const y0 = y * ct - z * st; z = y * st + z * ct; y = y0;
        const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
        const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        const d = (i / RING - head + 1) % 1;
        const trail = d > 0.86 ? (d - 0.86) / 0.14 : 0;
        const front = z2 > 0 ? 1 : 0.35;
        ctx.fillStyle = `rgba(255,74,61,${(0.25 + trail * 0.75) * front})`;
        const sz = 1.1 + trail * 2.4;
        ctx.fillRect(cx + x1 * R - sz / 2, cyy - y2 * R - sz / 2, sz, sz);
      }
    };

    if (env.reduced) { draw({ ...state, time: 0, pointerActive: false }, 0); return () => ro.disconnect(); }
    const stop = whileVisible(canvas, draw);
    return () => { stop(); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className={`sphere ${className}`} aria-hidden="true" />;
}

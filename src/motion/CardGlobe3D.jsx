import { useEffect, useRef } from 'react';
import LAND from '../data/landDots.json';
import { env, whileVisible, lerp } from './engine.js';

const RED = [229, 38, 31];
const D2R = Math.PI / 180;

const toVec = (lon, lat) => {
  const la = lat * D2R, lo = lon * D2R;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
};

const DOTS = new Float32Array((LAND.length / 2) * 3);
for (let i = 0, j = 0; i < LAND.length; i += 2, j += 3) {
  const v = toVec(LAND[i], LAND[i + 1]);
  DOTS[j] = v[0]; DOTS[j + 1] = v[1]; DOTS[j + 2] = v[2];
}

const NODES = [
  toVec(78.49, 17.38),  // India
  toVec(-96.8, 32.78),  // Dallas
  toVec(151.2, -33.87), // Australia
  toVec(2.35, 48.85),   // Europe
];

export default function CardGlobe3D({ className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const host = canvas.closest('[data-tilt]') || canvas.parentElement;

    let W = 0, H = 0, dpr = 1;
    let lon = -40, lat = 12, yaw = 0, pitch = 0, hover = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (st, dt) => {
      const hr = host.getBoundingClientRect();
      const over = env.fine && st.pointerActive && st.x > hr.left && st.x < hr.right && st.y > hr.top && st.y < hr.bottom;
      hover = lerp(hover, over ? 1 : 0, 1 - Math.pow(0.02, dt));

      if (over) {
        yaw = lerp(yaw, ((st.x - hr.left) / hr.width - 0.5) * 0.8, 0.1);
        pitch = lerp(pitch, ((st.y - hr.top) / hr.height - 0.5) * 0.5, 0.1);
      } else {
        yaw = lerp(yaw, 0, 0.05);
        pitch = lerp(pitch, 0, 0.05);
      }

      if (!env.reduced) lon += dt * (18 + hover * 14);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * 0.42;

      // Outer Red Atmosphere Aura
      const aura = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.45);
      aura.addColorStop(0, `rgba(229, 38, 31, ${0.45 + hover * 0.15})`);
      aura.addColorStop(0.4, `rgba(229, 38, 31, ${0.18 + hover * 0.08})`);
      aura.addColorStop(1, 'rgba(229, 38, 31, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, W, H);

      // Sphere Body
      const body = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.25, 0, cx, cy, R);
      body.addColorStop(0, '#2e1211');
      body.addColorStop(0.6, '#180a0a');
      body.addColorStop(1, '#0c0707');
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.fill();

      // Rotation angles
      const loRad = (lon + yaw * 40) * D2R;
      const laRad = (lat + pitch * 30) * D2R;
      const cosLo = Math.cos(loRad), sinLo = Math.sin(loRad);
      const cosLa = Math.cos(laRad), sinLa = Math.sin(laRad);

      // Land dots
      const numDots = DOTS.length / 3;
      for (let i = 0; i < numDots; i++) {
        const x0 = DOTS[i * 3], y0 = DOTS[i * 3 + 1], z0 = DOTS[i * 3 + 2];
        // Rotate around Y (longitude)
        const x1 = x0 * cosLo + z0 * sinLo;
        const z1 = -x0 * sinLo + z0 * cosLo;
        // Rotate around X (latitude)
        const y2 = y0 * cosLa - z1 * sinLa;
        const z2 = y0 * sinLa + z1 * cosLa;

        if (z2 > -0.05) {
          const depth = (z2 + 1) / 2; // 0..1
          const px = cx + x1 * R;
          const py = cy - y2 * R;
          const sz = (1.1 + depth * 1.4);
          const alpha = 0.25 + depth * 0.75;

          ctx.fillStyle = depth > 0.6
            ? `rgba(255, 180, 175, ${alpha})`
            : `rgba(229, 38, 31, ${alpha * 0.85})`;
          ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
        }
      }

      // Connecting network arcs & pulsing nodes
      const timeSec = st.time / 1000;
      NODES.forEach((n, idx) => {
        const x1 = n[0] * cosLo + n[2] * sinLo;
        const z1 = -n[0] * sinLo + n[2] * cosLo;
        const y2 = n[1] * cosLa - z1 * sinLa;
        const z2 = n[1] * sinLa + z1 * cosLa;

        if (z2 > 0.1) {
          const px = cx + x1 * R;
          const py = cy - y2 * R;
          const pRadius = 4 + Math.sin(timeSec * 3 + idx) * 2;

          // Node core
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          // Node halo
          ctx.beginPath();
          ctx.arc(px, py, pRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 74, 61, ${0.7 - (pRadius / 8) * 0.3})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // Glowing Atmosphere Rim Ring
      ctx.shadowColor = 'rgba(229, 38, 31, 0.9)';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 80, 65, 0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const stop = whileVisible(canvas, draw);
    return () => { stop(); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className={`card-globe-3d ${className}`} aria-hidden="true" />;
}

// Interactive 2D constellation canvas for the Hero section.
// Matches the animation on the live margam360.com site exactly.
import { useEffect, useRef } from 'react';
import { env, whileVisible, state, clamp, lerp } from './engine.js';

const LINK_DIST = 118;
const PULSE_INTERVAL = 0.55;

function makeGlowSprite(rgb) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(${rgb}, 1)`);
  grad.addColorStop(0.22, `rgba(${rgb}, 0.55)`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return canvas;
}

export default function HeroField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const spriteWhite = makeGlowSprite('255, 214, 200');
    const spriteRed = makeGlowSprite('255, 74, 61');

    const N = env.mobile ? 46 : 104;
    const particles = Array.from({ length: N }, () => {
      const z = 0.18 + Math.random() * 0.82;
      return {
        x: Math.random(), y: Math.random(), z,
        vy: (0.006 + Math.random() * 0.012) * (0.4 + z),
        sway: Math.random() * Math.PI * 2,
        r: 0.6 + z * 1.5,
        tw: Math.random() * Math.PI * 2,
        sx: 0, sy: 0, a: 0,
      };
    });

    const closeParticles = particles.filter((p) => p.z > 0.58);
    let W = 0, H = 0, dpr = 1;
    let bounds = { l: 0, t: 0, r: 0, b: 0 };
    let panX = 0, panY = 0;
    let startTime = performance.now();
    let pulses = [];
    let pulseTimer = 0;
    const dprCap = env.mobile ? 1.25 : 1.5;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      const copyRect = parent.querySelector('.hero-copy')?.getBoundingClientRect();
      if (copyRect) {
        bounds = {
          l: copyRect.left - rect.left - 30,
          t: copyRect.top - rect.top - 20,
          r: copyRect.right - rect.left + 10,
          b: copyRect.bottom - rect.top + 10,
        };
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    const avoid = (x, y) => {
      const dx = Math.max(bounds.l - x, 0, x - bounds.r);
      const dy = Math.max(bounds.t - y, 0, y - bounds.b);
      return 1 - clamp(Math.hypot(dx, dy) / 90);
    };

    const draw = (st, dt) => {
      const now = st.time;
      const fadeIn = clamp((now - startTime - 350) / 1600);
      if (env.fine && st.pointerActive) {
        panX = lerp(panX, st.x / st.vw - 0.5, 1 - Math.pow(0.04, dt));
        panY = lerp(panY, st.y / st.vh - 0.5, 1 - Math.pow(0.04, dt));
      }
      const sy = Math.min(st.scrollY, H);
      const velFactor = 1 + Math.min(4, Math.abs(st.velocity) * 0.25);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (fadeIn <= 0) return;

      for (const p of particles) {
        if (!env.reduced) {
          p.y -= p.vy * dt * velFactor;
          if (p.y < -0.05) { p.y += 1.1; p.x = Math.random(); }
          p.sway += dt * 0.35;
        }
        const z2 = p.z * p.z;
        p.sx = p.x * W + Math.sin(p.sway) * 14 * p.z - panX * 46 * z2;
        p.sy = p.y * H - panY * 30 * z2 - sy * 0.22 * p.z;
        const twinkle = 0.75 + 0.25 * Math.sin(now / 900 + p.tw);
        p.a = (0.12 + 0.70 * z2) * twinkle * (1 - 0.78 * avoid(p.sx, p.sy)) * fadeIn;
      }

      const parentRect = parent.getBoundingClientRect();
      const ptrX = st.x - parentRect.left;
      const ptrY = st.y - parentRect.top;
      const ptrActive = env.fine && st.pointerActive;

      ctx.lineWidth = 0.7;
      const activePairs = [];

      for (let i = 0; i < closeParticles.length; i++) {
        const p1 = closeParticles[i];
        for (let j = i + 1; j < closeParticles.length; j++) {
          const p2 = closeParticles[j];
          const dx = p1.sx - p2.sx, dy = p1.sy - p2.sy;
          const distSq = dx * dx + dy * dy;
          if (distSq > LINK_DIST * LINK_DIST) continue;
          const baseAlpha = 1 - Math.sqrt(distSq) / LINK_DIST;
          let pointerBoost = 0;
          if (ptrActive) {
            const midX = (p1.sx + p2.sx) / 2 - ptrX;
            const midY = (p1.sy + p2.sy) / 2 - ptrY;
            pointerBoost = 1 - clamp(Math.hypot(midX, midY) / 220);
          }
          const strokeAlpha = Math.min(p1.a, p2.a) * baseAlpha * (0.42 + pointerBoost * 0.9);
          if (strokeAlpha < 0.01) continue;
          ctx.strokeStyle = `rgba(229,38,31,${strokeAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.stroke();
          activePairs.push([p1, p2]);
        }
      }

      for (const p of particles) {
        if (p.a < 0.02) continue;
        const size = p.r * 2;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.z > 0.55 ? '#ffe9e2' : '#ff4a3d';
        ctx.fillRect(p.sx - size / 2, p.sy - size / 2, size, size);
        if (p.z > 0.86) {
          const glowSize = p.r * 9;
          ctx.globalAlpha = p.a * 0.35;
          ctx.drawImage(spriteRed, p.sx - glowSize / 2, p.sy - glowSize / 2, glowSize, glowSize);
        }
      }
      ctx.globalAlpha = 1;

      if (!env.reduced) {
        pulseTimer += dt;
        if (pulseTimer > PULSE_INTERVAL && activePairs.length) {
          pulseTimer = 0;
          const [a, b] = activePairs[(Math.random() * activePairs.length) | 0];
          pulses.push({ a, b, t: 0 });
        }
        pulses = pulses.filter((pulse) => (pulse.t += dt * 1.25) < 1);
        for (const pulse of pulses) {
          const px = lerp(pulse.a.sx, pulse.b.sx, pulse.t);
          const py = lerp(pulse.a.sy, pulse.b.sy, pulse.t);
          const alpha = Math.sin(pulse.t * Math.PI) * Math.min(pulse.a.a, pulse.b.a) * 1.6;
          ctx.globalAlpha = clamp(alpha);
          ctx.drawImage(spriteWhite, px - 7, py - 7, 14, 14);
        }
        ctx.globalAlpha = 1;
      }
    };

    if (env.reduced) {
      startTime = -1e9;
      draw({ ...state, time: 0, velocity: 0, pointerActive: false }, 0);
      return () => ro.disconnect();
    }
    startTime = performance.now();
    const stop = whileVisible(canvas, draw);
    return () => { stop(); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className="hero-field" aria-hidden="true" />;
}

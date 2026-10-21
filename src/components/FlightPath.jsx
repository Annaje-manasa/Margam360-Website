import { useEffect, useRef } from 'react';

/*
  Cinematic jet that flies a long arc across the hero and descends
  into the globe. Drawn on a canvas overlay:
   - private-jet silhouette (top view) with brushed-metal shading,
     tinted canopy, red brand cheatline, engine afterglow and strobes
   - fake bank/roll from path curvature, perspective shrink on approach
   - dashed red route trail (the reference's motif) + soft vapor wake
  Fires `m360:arrive` so the globe can flash when the jet lands.
*/

const RED = '229,38,31';

// Jet geometry, nose pointing +x, ~170 units long, centred on origin.
const P = {
  fuselage:
    'M86,0 C80,-5.5 64,-9.5 38,-10 L-52,-8.6 C-66,-8 -79,-5 -86,0 C-79,5 -66,8 -52,8.6 L38,10 C64,9.5 80,5.5 86,0 Z',
  wingL: 'M24,-9 C8,-26 -14,-52 -30,-74 L-36,-78 L-44,-76 L-20,-9 Z',
  wingR: 'M24,9 C8,26 -14,52 -30,74 L-36,78 L-44,76 L-20,9 Z',
  winglets: 'M-30,-74 L-36,-78 L-44,-76 L-41,-73 Z M-30,74 L-36,78 L-44,76 L-41,73 Z',
  tailL: 'M-60,-7.5 L-80,-30 L-89,-31 L-80,-7 Z',
  tailR: 'M-60,7.5 L-80,30 L-89,31 L-80,7 Z',
  engineL: 'M-38,-12 C-38,-18.5 -42,-20 -48,-20 L-66,-19 C-69,-18.5 -70,-16 -70,-15.5 L-70,-11.5 C-70,-11 -69,-9 -66,-9 L-48,-8.5 C-42,-8.5 -38,-9.5 -38,-12 Z',
  engineR: 'M-38,12 C-38,18.5 -42,20 -48,20 L-66,19 C-69,18.5 -70,16 -70,15.5 L-70,11.5 C-70,11 -69,9 -66,9 L-48,8.5 C-42,8.5 -38,9.5 -38,12 Z',
  canopy: 'M72,-4.6 C64,-7.2 54,-7.6 47,-7 C45.5,-3 45.5,3 47,7 C54,7.6 64,7.2 72,4.6 C75,2 75,-2 72,-4.6 Z',
  cheat: 'M44,-1.1 L-74,-1.1 C-76,-0.5 -76,0.5 -74,1.1 L44,1.1 C46,0.6 46,-0.6 44,-1.1 Z',
};

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

export default function FlightPath({ heroRef, globeRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const hero = heroRef.current;
    const globe = globeRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const paths = Object.fromEntries(Object.entries(P).map(([k, d]) => [k, new Path2D(d)]));

    let W = 0, H = 0, dpr = 1;
    let samples = []; // {x,y,len}
    let total = 0;
    let jetPx = 140; // jet length in px at scale 1

    const bez = (p0, p1, p2, p3, t) => {
      const u = 1 - t;
      return [
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ];
    };

    const layout = () => {
      const hr = hero.getBoundingClientRect();
      const gr = globe.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      W = hr.width; H = hr.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';

      const gR = Math.min(gr.width, gr.height) * 0.446; // matches the globe's drawn radius
      const gcx = gr.left - hr.left + gr.width / 2;
      const gcy = gr.top - hr.top + gr.height / 2;
      const mobile = W < 900;
      const end = [gcx - gR * 0.3, gcy + gR * 0.12];
      const view = Math.min(H, window.innerHeight);
      const start = mobile ? [-W * 0.15, gcy + gR * 1.6] : [-W * 0.06, Math.min(view * 0.985, gcy + gR * 1.6)];
      const c1 = mobile ? [W * 0.3, gcy + gR * 1.5] : [W * 0.46, start[1] + view * 0.03];
      const c2 = mobile ? [end[0] - W * 0.25, end[1] + gR * 0.9] : [end[0] - W * 0.1, end[1] + gR * 1.0];

      samples = [];
      total = 0;
      let prev = null;
      for (let i = 0; i <= 600; i++) {
        const p = bez(start, c1, c2, end, i / 600);
        if (prev) total += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        samples.push({ x: p[0], y: p[1], len: total });
        prev = p;
      }
      jetPx = Math.max(90, Math.min(200, W * 0.115));
    };

    // point + tangent at an arc-length distance
    const at = (d) => {
      d = Math.max(0, Math.min(total, d));
      let lo = 0, hi = samples.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (samples[mid].len < d) lo = mid; else hi = mid;
      }
      const a = samples[lo], b = samples[hi];
      const k = (d - a.len) / (b.len - a.len || 1);
      return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), ang: Math.atan2(b.y - a.y, b.x - a.x) };
    };

    const drawJet = (x, y, ang, scale, roll, alpha, time) => {
      const s = (jetPx / 175) * scale;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.globalAlpha = alpha;

      // soft shadow beneath the jet (gradient ellipse — far cheaper than a blur filter)
      const sh = ctx.createRadialGradient(-14 * s, 22 * s, 0, -14 * s, 22 * s, 80 * s);
      sh.addColorStop(0, 'rgba(0,0,0,0.5)');
      sh.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sh;
      ctx.beginPath();
      ctx.ellipse(-14 * s, 22 * s, 90 * s, 60 * s * (1 - Math.abs(roll) * 0.4), 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.scale(s, s * (1 - Math.abs(roll) * 0.35));

      // engine afterglow
      const flick = 0.85 + Math.sin(time / 37) * 0.08 + Math.sin(time / 13) * 0.05;
      [-14.5, 14.5].forEach((ey) => {
        const g = ctx.createRadialGradient(-72, ey, 0, -72, ey, 26);
        g.addColorStop(0, `rgba(255,190,150,${0.95 * flick})`);
        g.addColorStop(0.25, `rgba(${RED},${0.7 * flick})`);
        g.addColorStop(1, `rgba(${RED},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(-82, ey, 26, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // wings: lit leading edge -> darker trailing edge (roll shifts the light)
      const wingGrad = (sign) => {
        const g = ctx.createLinearGradient(20, 0, -40, sign * 40);
        const k = 0.5 + roll * sign * 0.5;
        g.addColorStop(0, `rgb(${Math.round(lerp(150, 236, k))},${Math.round(lerp(152, 238, k))},${Math.round(lerp(160, 243, k))})`);
        g.addColorStop(0.55, '#8a8d96');
        g.addColorStop(1, '#3d3f46');
        return g;
      };
      ctx.fillStyle = wingGrad(-1); ctx.fill(paths.wingL);
      ctx.fillStyle = wingGrad(1); ctx.fill(paths.wingR);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 0.6;
      ctx.stroke(paths.wingL); ctx.stroke(paths.wingR);

      // tailplane
      const tg = ctx.createLinearGradient(-60, 0, -88, 0);
      tg.addColorStop(0, '#c9ccd3'); tg.addColorStop(1, '#5c5f68');
      ctx.fillStyle = tg; ctx.fill(paths.tailL); ctx.fill(paths.tailR);

      // brand red winglets
      ctx.fillStyle = `rgb(${RED})`;
      ctx.fill(paths.winglets);

      // fuselage — brushed metal, highlight along the spine
      const fg = ctx.createLinearGradient(0, -10, 0, 10);
      fg.addColorStop(0, '#4a4d55');
      fg.addColorStop(0.32, '#f6f7f9');
      fg.addColorStop(0.5, '#dfe1e6');
      fg.addColorStop(0.78, '#8b8e97');
      fg.addColorStop(1, '#2c2e34');
      ctx.fillStyle = fg;
      ctx.fill(paths.fuselage);

      // engines
      const eg = ctx.createLinearGradient(0, -20, 0, 20);
      eg.addColorStop(0, '#2a2c31'); eg.addColorStop(0.5, '#a5a8b0'); eg.addColorStop(1, '#22242a');
      ctx.fillStyle = eg;
      ctx.fill(paths.engineL); ctx.fill(paths.engineR);
      ctx.fillStyle = `rgba(${RED},0.95)`;
      ctx.fillRect(-46, -20, 2.2, 11.5);
      ctx.fillRect(-46, 8.5, 2.2, 11.5);

      // red cheatline
      const cg = ctx.createLinearGradient(44, 0, -76, 0);
      cg.addColorStop(0, `rgba(${RED},0)`);
      cg.addColorStop(0.15, `rgba(${RED},1)`);
      cg.addColorStop(1, `rgba(${RED},0.85)`);
      ctx.fillStyle = cg;
      ctx.fill(paths.cheat);

      // tinted canopy with specular streak
      const cnp = ctx.createLinearGradient(74, -6, 46, 6);
      cnp.addColorStop(0, '#0d0f14'); cnp.addColorStop(0.45, '#2a3240'); cnp.addColorStop(1, '#07080b');
      ctx.fillStyle = cnp;
      ctx.fill(paths.canopy);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(68, -3.6); ctx.quadraticCurveTo(60, -5.8, 51, -5.4);
      ctx.stroke();

      // strobes on wingtips + tail
      const blink = (time % 1400) < 90;
      if (blink) {
        [[-38, -77], [-38, 77], [-86, 0]].forEach(([bx, by]) => {
          const g = ctx.createRadialGradient(bx, by, 0, bx, by, 9);
          g.addColorStop(0, 'rgba(255,255,255,1)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();
        });
      }
      ctx.restore();
    };

    const FLY = 6800, HOLD = 2200, LOOP = FLY + HOLD;
    let raf = 0, t0 = performance.now(), arrived = false, visible = true;

    const frame = (now) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (!samples.length) { raf = requestAnimationFrame(frame); return; }

      const el = reduce ? FLY * 0.62 : Math.max(0, now - t0) % LOOP;
      if (el < 50) arrived = false;
      const tf = Math.min(1, el / FLY);
      const e = easeInOut(tf);
      const d = e * total;
      const trailFade = el > FLY ? 1 - (el - FLY) / HOLD : 1;

      // dashed route trail behind the jet
      const dash = Math.max(10, jetPx * 0.11), gap = dash * 0.7;
      ctx.lineCap = 'round';
      for (let s = 0; s < d - jetPx * 0.25; s += dash + gap) {
        const a = at(s), b = at(Math.min(s + dash, d));
        const k = s / Math.max(1, d);
        ctx.strokeStyle = `rgba(${RED},${(0.15 + 0.75 * k) * trailFade})`;
        ctx.lineWidth = lerp(2, 3.4, k) * lerp(1, 0.55, e);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }

      if (tf < 1) {
        const p = at(d);
        const p2 = at(d + 6), p0 = at(d - 6);
        let dAng = p2.ang - p0.ang;
        if (dAng > Math.PI) dAng -= Math.PI * 2;
        if (dAng < -Math.PI) dAng += Math.PI * 2;
        const roll = Math.max(-1, Math.min(1, dAng * 18));
        const scale = lerp(1.15, 0.42, Math.pow(e, 1.25));
        const alpha = tf > 0.86 ? Math.max(0, 1 - (tf - 0.86) / 0.14) : Math.min(1, tf * 10);

        // vapor wake: soft white streak hugging the last stretch
        const wake = jetPx * 1.6 * scale;
        for (let i = 0; i < 18; i++) {
          const s0 = d - jetPx * 0.45 * scale - (i / 18) * wake;
          const s1 = s0 - wake / 18;
          if (s1 < 0) break;
          const a = at(s0), b = at(s1);
          ctx.strokeStyle = `rgba(255,236,230,${0.32 * (1 - i / 18) * alpha})`;
          ctx.lineWidth = 3.2 * scale * (1 - i / 22);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }

        drawJet(p.x, p.y, p.ang, scale, roll, alpha, now);

        if (tf > 0.95 && !arrived) {
          arrived = true;
          window.dispatchEvent(new CustomEvent('m360:arrive'));
        }
      }
      raf = visible ? requestAnimationFrame(frame) : 0;
    };

    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(hero);
    ro.observe(globe);
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    });
    io.observe(hero);
    // start after fonts settle so the layout is final
    const startT = setTimeout(() => { layout(); t0 = performance.now(); }, 400);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(startT);
      ro.disconnect();
      io.disconnect();
    };
  }, [heroRef, globeRef]);

  return <canvas ref={canvasRef} className="flight" aria-hidden="true" />;
}

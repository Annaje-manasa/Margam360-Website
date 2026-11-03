import { useEffect, useRef } from 'react';
import LAND from '../data/landDots.json';

/*
  Dotted world globe matching the reference site exactly:
  dark sphere, white dotted continents lit from the upper-right,
  glowing red limb, outer red atmosphere halo, orbiting constellation dust,
  satellite orbital ring with traveling satellites, map pins with
  dark pill labels, and expanding arrival ripples with dashed flight arcs.
*/

const RED = [229, 38, 31];
const D2R = Math.PI / 180;

// Offices / markets. `hq` gets the pulsing ring.
const PLACES = [
  { name: 'Hyderabad (India)', lon: 78.49, lat: 17.38, hq: true },
  { name: 'Dallas (USA)', lon: -96.8, lat: 32.78 },
  { name: 'Columbus (USA)', lon: -82.99, lat: 39.96 },
  { name: 'Australia', lon: 151.2, lat: -33.87 },
];
const ROUTES = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
];

// Pre-compute unit vectors for every land dot (x right, y up, z toward viewer at lon 0).
const toVec = (lon, lat) => {
  const la = lat * D2R, lo = lon * D2R;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
};
const DOTS = new Float32Array((LAND.length / 2) * 3);
for (let i = 0, j = 0; i < LAND.length; i += 2, j += 3) {
  const v = toVec(LAND[i], LAND[i + 1]);
  DOTS[j] = v[0]; DOTS[j + 1] = v[1]; DOTS[j + 2] = v[2];
}
const PLACE_V = PLACES.map((p) => toVec(p.lon, p.lat));

// Great-circle arc lifted off the surface (so it reads as a flight path).
function arcPoints(a, b, steps = 72) {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const w = Math.acos(dot), s = Math.sin(w) || 1;
  const lift = 0.1 + w * 0.09;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const k1 = Math.sin((1 - t) * w) / s, k2 = Math.sin(t * w) / s;
    const h = 1 + lift * Math.sin(Math.PI * t);
    pts.push([(a[0] * k1 + b[0] * k2) * h, (a[1] * k1 + b[1] * k2) * h, (a[2] * k1 + b[2] * k2) * h]);
  }
  return pts;
}
const ROUTE_PTS = ROUTES.map(([a, b]) => arcPoints(PLACE_V[a], PLACE_V[b]));

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
const DUST_COUNT = isMobile ? 70 : 150;
const DUST = (() => {
  const d = new Float32Array(DUST_COUNT * 4);
  for (let i = 0; i < DUST_COUNT; i++) {
    let x = 0, y = 0, z = 0, len = 0;
    while (len < 0.001) {
      x = Math.random() * 2 - 1;
      y = (Math.random() * 2 - 1) * 0.7;
      z = Math.random() * 2 - 1;
      len = Math.hypot(x, y, z);
    }
    const r = 1.05 + Math.pow(Math.random(), 1.6) * 0.29;
    d[i * 4] = (x / len) * r;
    d[i * 4 + 1] = (y / len) * r;
    d[i * 4 + 2] = (z / len) * r;
    d[i * 4 + 3] = Math.random() * 6.28;
  }
  return d;
})();

const ORBIT_STEPS = isMobile ? 90 : 150;
const ORBIT_RADIUS = 1.24;
const ORBIT_TILT_X = 1.2;
const ORBIT_TILT_Y = -0.42;

const makeSatelliteSprite = () => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,236,228,1)');
  g.addColorStop(0.25, 'rgba(255,74,61,0.75)');
  g.addColorStop(1, 'rgba(229,38,31,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return c;
};
const SATELLITE_SPRITE = makeSatelliteSprite();

const LIGHT = (() => {
  const l = [0.55, 0.62, 0.56];
  const m = Math.hypot(...l);
  return l.map((v) => v / m);
})();

export default function Globe({ className = '' }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // View: starts on the reference framing (Pacific-centred, Americas upper-right,
    // Australia lower-left) and slowly turns so Hyderabad (India) rolls into view.
    const view = { lon: -150, lat: 14, roll: -14, tiltX: 0, tiltY: 0 };
    const targetTilt = { x: 0, y: 0 };
    let arrivals = [];
    const lastProgress = ROUTES.map(() => 0);
    let orbitPhase = 0, satPhase = 0;
    let W = 0, H = 0, dpr = 1, R = 0, cx = 0, cy = 0;
    let raf = 0, last = performance.now(), visible = true;
    let pulse = 0; // jet-arrival flash 0..1

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      R = Math.min(W, H) * 0.31;
      cx = W * 0.5; cy = H * 0.5;
      buildLayers();
    };

    const backLayer = document.createElement('canvas');
    const frontLayer = document.createElement('canvas');
    const pulseLayer = document.createElement('canvas');
    const glowLayer = document.createElement('canvas');

    const layerCtx = (c) => {
      c.width = canvas.width; c.height = canvas.height;
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      return g;
    };

    function buildLayers() {
      // 1. Base halo and globe sphere body
      let g = layerCtx(backLayer);
      const halo = g.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.42);
      halo.addColorStop(0, rgba(RED, 0.28));
      halo.addColorStop(0.35, rgba(RED, 0.08));
      halo.addColorStop(1, rgba(RED, 0));
      g.fillStyle = halo;
      g.fillRect(0, 0, W, H);
      const body = g.createRadialGradient(cx + R * 0.32, cy - R * 0.38, R * 0.05, cx, cy, R);
      body.addColorStop(0, '#2b1715');
      body.addColorStop(0.45, '#170f0e');
      body.addColorStop(1, '#0c0909');
      g.beginPath();
      g.arc(cx, cy, R, 0, Math.PI * 2);
      g.fillStyle = body;
      g.fill();

      // 2. Arrival pulse layer
      g = layerCtx(pulseLayer);
      const ph = g.createRadialGradient(cx, cy, R * 0.75, cx, cy, R * 1.5);
      ph.addColorStop(0, rgba(RED, 0));
      ph.addColorStop(0.3, rgba(RED, 0.5));
      ph.addColorStop(1, rgba(RED, 0));
      g.fillStyle = ph;
      g.fillRect(0, 0, W, H);

      // 3. Inner rim glow + limb stroke
      g = layerCtx(frontLayer);
      const rim = g.createRadialGradient(cx, cy, R * 0.72, cx, cy, R);
      rim.addColorStop(0, rgba(RED, 0));
      rim.addColorStop(0.8, rgba(RED, 0.1));
      rim.addColorStop(1, rgba(RED, 0.5));
      g.beginPath();
      g.arc(cx, cy, R, 0, Math.PI * 2);
      g.fillStyle = rim;
      g.fill();
      g.shadowColor = rgba(RED, 1);
      g.shadowBlur = R * 0.12;
      g.beginPath();
      g.arc(cx, cy, R, 0, Math.PI * 2);
      g.strokeStyle = rgba([255, 70, 55], 0.95);
      g.lineWidth = Math.max(1.5, R * 0.009);
      g.stroke();
      g.stroke();

      // 4. Outer atmosphere glow ring + crescent highlight
      g = layerCtx(glowLayer);
      const atmo = g.createRadialGradient(cx, cy, R * 0.99, cx, cy, R * 1.2);
      atmo.addColorStop(0, rgba([255, 90, 70], 0.42));
      atmo.addColorStop(0.18, rgba(RED, 0.16));
      atmo.addColorStop(1, rgba(RED, 0));
      g.fillStyle = atmo;
      g.beginPath();
      g.arc(cx, cy, R * 1.2, 0, Math.PI * 2);
      g.arc(cx, cy, R * 0.99, 0, Math.PI * 2, true);
      g.fill();
      g.save();
      g.shadowColor = 'rgba(255,200,185,0.9)';
      g.shadowBlur = R * 0.05;
      g.strokeStyle = 'rgba(255,226,216,0.38)';
      g.lineCap = 'round';
      g.lineWidth = Math.max(1, R * 0.008);
      g.beginPath();
      g.arc(cx, cy, R * 0.965, -Math.PI * 0.43, -Math.PI * 0.08);
      g.stroke();
      g.restore();
    }

    // rotation matrix for the current view
    let m = new Float32Array(9);
    const buildMatrix = () => {
      const lo = -(view.lon + view.tiltX) * D2R;
      const la = (view.lat + view.tiltY) * D2R;
      const ro = view.roll * D2R;
      const cl = Math.cos(lo), sl = Math.sin(lo);
      const cp = Math.cos(la), sp = Math.sin(la);
      const cr = Math.cos(ro), sr = Math.sin(ro);
      const a = [cl, 0, sl];
      const b = [sl * sp, cp, -cl * sp];
      const c = [-sl * cp, sp, cl * cp];
      m[0] = a[0] * cr - b[0] * sr; m[1] = a[1] * cr - b[1] * sr; m[2] = a[2] * cr - b[2] * sr;
      m[3] = a[0] * sr + b[0] * cr; m[4] = a[1] * sr + b[1] * cr; m[5] = a[2] * sr + b[2] * cr;
      m[6] = c[0]; m[7] = c[1]; m[8] = c[2];
    };
    const rot = (x, y, z, out) => {
      out[0] = m[0] * x + m[1] * y + m[2] * z;
      out[1] = m[3] * x + m[4] * y + m[5] * z;
      out[2] = m[6] * x + m[7] * y + m[8] * z;
      return out;
    };
    const tmp = [0, 0, 0];

    const drawPin = (x, y, s, hq, time) => {
      if (hq) {
        const ph = (time / 1600) % 1;
        ctx.beginPath();
        ctx.arc(x, y, s * (1 + ph * 4), 0, Math.PI * 2);
        ctx.strokeStyle = rgba(RED, 0.7 * (1 - ph));
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      const h = s * 2.3;
      ctx.save();
      ctx.shadowColor = rgba(RED, 0.9);
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x - s * 0.9, y - h * 0.55, x - s * 1.05, y - h, x, y - h);
      ctx.bezierCurveTo(x + s * 1.05, y - h, x + s * 0.9, y - h * 0.55, x, y);
      ctx.fillStyle = rgba(RED, 1);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(x, y - h * 0.68, s * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    };

    const drawLabel = (x, y, text, alpha) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `600 ${Math.max(10, R * 0.052)}px Geist, system-ui, sans-serif`;
      const pad = R * 0.04;
      const tw = ctx.measureText(text).width;
      const h = R * 0.105;
      const w = tw + pad * 2 + R * 0.05;
      const lx = x + R * 0.04, ly = y - h / 2;
      ctx.beginPath();
      ctx.roundRect(lx, ly, w, h, h / 2);
      ctx.fillStyle = 'rgba(14,12,12,0.86)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(lx + pad + R * 0.008, y, R * 0.011, 0, Math.PI * 2);
      ctx.fillStyle = rgba(RED, 1);
      ctx.fill();
      ctx.fillStyle = '#f4efec';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, lx + pad + R * 0.04, y + 0.5);
      ctx.restore();
    };

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduce) view.lon -= dt * 5;
      const smooth = 1 - Math.pow(0.03, dt);
      view.tiltX += (targetTilt.x - view.tiltX) * smooth;
      view.tiltY += (targetTilt.y - view.tiltY) * smooth;
      if (!reduce) {
        orbitPhase += dt * 0.05;
        satPhase += dt * 0.085;
      }
      pulse = Math.max(0, pulse - dt * 0.9);
      buildMatrix();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // static layers (halo + sphere body)
      ctx.drawImage(backLayer, 0, 0, W, H);
      if (pulse > 0.01) {
        ctx.globalAlpha = pulse;
        ctx.drawImage(pulseLayer, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      // Constellation orbital dust
      const cosO = Math.cos(orbitPhase), sinO = Math.sin(orbitPhase);
      const drawDust = (isFront) => {
        ctx.fillStyle = isFront ? '#ffe6de' : '#ff4a3d';
        for (let n = 0; n < DUST.length; n += 4) {
          const a = DUST[n], o = DUST[n + 2];
          rot(a * cosO + o * sinO, DUST[n + 1], -a * sinO + o * cosO, tmp);
          if ((tmp[2] > 0) !== isFront) continue;
          const shimmer = 0.6 + 0.4 * Math.sin(now / 700 + DUST[n + 3]);
          const alpha = (isFront ? 0.22 + tmp[2] * 0.5 : 0.18) * shimmer;
          ctx.globalAlpha = alpha;
          const sz = Math.max(0.8, R * (isFront ? 0.0062 : 0.0045));
          ctx.fillRect(cx + tmp[0] * R - sz / 2, cy - tmp[1] * R - sz / 2, sz, sz);
        }
        ctx.globalAlpha = 1;
      };

      // Draw dust behind globe
      drawDust(false);

      // dotted continents
      const ds = Math.max(1, R * 0.0072);
      ctx.fillStyle = '#fff4f0';
      for (let j = 0; j < DOTS.length; j += 3) {
        rot(DOTS[j], DOTS[j + 1], DOTS[j + 2], tmp);
        const z = tmp[2];
        if (z <= 0.02) continue;
        const lit = tmp[0] * LIGHT[0] + tmp[1] * LIGHT[1] + z * LIGHT[2];
        const a = Math.min(1, (0.16 + 0.84 * Math.max(0, lit)) * Math.min(1, z * 3.2));
        if (a < 0.04) continue;
        ctx.globalAlpha = a;
        const sz = ds * (0.55 + 0.45 * z);
        ctx.fillRect(cx + tmp[0] * R - sz / 2, cy - tmp[1] * R - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;

      // rim glow + glowing limb
      ctx.drawImage(frontLayer, 0, 0, W, H);
      // outer glowing atmosphere ring + crescent
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(now / 2400);
      ctx.drawImage(glowLayer, 0, 0, W, H);
      ctx.globalAlpha = 1;

      // flight arcs between offices
      const off = reduce ? 0 : -(now / 45);
      const dashLen = R * 0.022, gapLen = R * 0.018;
      const period = dashLen + gapLen;
      const maxOutside = 3.05 * period;

      ROUTE_PTS.forEach((pts, ri) => {
        ctx.save();
        ctx.setLineDash([dashLen, gapLen]);
        ctx.lineDashOffset = off;
        ctx.lineWidth = Math.max(1, R * 0.0065);
        ctx.strokeStyle = rgba([255, 60, 45], 0.9);

        const projected = [];
        for (let i = 0; i < pts.length; i++) {
          rot(pts[i][0], pts[i][1], pts[i][2], tmp);
          const px = cx + tmp[0] * R, py = cy - tmp[1] * R;
          const inFront = tmp[2] > 0;
          const rDist = Math.hypot(tmp[0], tmp[1]);
          projected.push({ px, py, inFront, isOutside: rDist > 1.01, distEdge: 0 });
        }

        let acc = 9999;
        for (let i = 0; i < projected.length; i++) {
          const p = projected[i];
          if (!p.isOutside) { acc = 0; p.distEdge = 0; }
          else {
            if (i > 0) acc += Math.hypot(p.px - projected[i - 1].px, p.py - projected[i - 1].py);
            p.distEdge = acc;
          }
        }
        acc = 9999;
        for (let i = projected.length - 1; i >= 0; i--) {
          const p = projected[i];
          if (!p.isOutside) { acc = 0; p.distEdge = 0; }
          else {
            if (i < projected.length - 1) acc += Math.hypot(p.px - projected[i + 1].px, p.py - projected[i + 1].py);
            p.distEdge = Math.min(p.distEdge, acc);
          }
        }

        let drawing = false;
        ctx.beginPath();
        const proj = [];
        for (let i = 0; i < projected.length; i++) {
          const p = projected[i];
          const visible = p.inFront && (!p.isOutside || p.distEdge <= maxOutside);
          proj.push([p.px, p.py, visible]);
          if (visible) {
            if (!drawing) { ctx.moveTo(p.px, p.py); drawing = true; }
            else { ctx.lineTo(p.px, p.py); }
          } else {
            drawing = false;
          }
        }
        ctx.stroke();
        ctx.restore();

        // travelling packet
        if (!reduce) {
          const k = ((now / 2600 + ri * 0.33) % 1);
          if (k < lastProgress[ri]) {
            arrivals.push({ v: PLACE_V[ROUTES[ri][1]], age: 0 });
          }
          lastProgress[ri] = k;
          const p = proj[Math.floor(k * (proj.length - 1))];
          if (p && p[2]) {
            const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], R * 0.035);
            g.addColorStop(0, 'rgba(255,230,220,1)');
            g.addColorStop(0.4, rgba(RED, 0.8));
            g.addColorStop(1, rgba(RED, 0));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p[0], p[1], R * 0.035, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // Arrival ripples
      arrivals = arrivals.filter((a) => (a.age += dt) < 1.5);
      arrivals.forEach((a) => {
        rot(a.v[0], a.v[1], a.v[2], tmp);
        if (tmp[2] < 0.12) return;
        const t = a.age / 1.5;
        const rad = R * (0.02 + t * 0.13);
        ctx.beginPath();
        ctx.ellipse(cx + tmp[0] * R, cy - tmp[1] * R, Math.max(0.5, rad * tmp[2]), rad, Math.atan2(-tmp[1], tmp[0]), 0, Math.PI * 2);
        ctx.strokeStyle = rgba([255, 90, 72], 0.85 * (1 - t) * Math.min(1, (tmp[2] - 0.12) * 4));
        ctx.lineWidth = Math.max(1, R * 0.006) * (1 - t * 0.6);
        ctx.stroke();
      });

      // Orbit ring and orbiting satellite
      {
        const cosX = Math.cos(ORBIT_TILT_X), sinX = Math.sin(ORBIT_TILT_X);
        const cosY = Math.cos(ORBIT_TILT_Y), sinY = Math.sin(ORBIT_TILT_Y);
        const tx = view.tiltX * D2R * 0.6, ty = view.tiltY * D2R * 0.6;
        const ctxCos = Math.cos(tx), ctxSin = Math.sin(tx);
        const ctyCos = Math.cos(ty), ctySin = Math.sin(ty);

        const projectOrbitPoint = (angle, out) => {
          let ox = Math.cos(angle) * ORBIT_RADIUS;
          let oy = 0;
          let oz = Math.sin(angle) * ORBIT_RADIUS;

          // Rotation around X tilt
          const py = oy * cosX - oz * sinX;
          oz = oy * sinX + oz * cosX;
          oy = py;

          // Rotation around Y tilt
          const px = ox * cosY - oy * sinY;
          oy = ox * sinY + oy * cosY;
          ox = px;

          // View parallax tilts
          const hx = ox * ctxCos + oz * ctxSin;
          oz = -ox * ctxSin + oz * ctxCos;
          ox = hx;

          const hy = oy * ctyCos - oz * ctySin;
          oz = oy * ctySin + oz * ctyCos;
          oy = hy;

          out[0] = ox; out[1] = oy; out[2] = oz;
          return out;
        };

        const satellites = [satPhase % 1, (satPhase + 0.5) % 1];

        // Orbit ring dotted track
        for (let i = 0; i < ORBIT_STEPS; i++) {
          const t = i / ORBIT_STEPS;
          projectOrbitPoint(t * Math.PI * 2, tmp);

          let lead = 0;
          for (const s of satellites) {
            const diff = (s - t + 1) % 1;
            if (diff < 0.12) lead = Math.max(lead, 1 - diff / 0.12);
          }
          const depthAlpha = tmp[2] > 0 ? 1 : 0.45;
          ctx.globalAlpha = (0.3 + lead * 0.65) * depthAlpha;
          ctx.fillStyle = lead > 0.05 ? '#ff6a58' : '#ff4a3d';
          const sz = Math.max(1.1, R * 0.0072) * (1 + lead * 1.4);
          ctx.fillRect(cx + tmp[0] * R - sz / 2, cy - tmp[1] * R - sz / 2, sz, sz);
        }
        ctx.globalAlpha = 1;

        // Orbiting glowing satellites
        if (SATELLITE_SPRITE) {
          satellites.forEach((s) => {
            projectOrbitPoint(s * Math.PI * 2, tmp);
            const sz = R * 0.11 * (tmp[2] > 0 ? 1 : 0.7);
            ctx.globalAlpha = tmp[2] > 0 ? 1 : 0.5;
            ctx.drawImage(SATELLITE_SPRITE, cx + tmp[0] * R - sz / 2, cy - tmp[1] * R - sz / 2, sz, sz);
          });
          ctx.globalAlpha = 1;
        }
      }

      // Draw dust in front of globe
      drawDust(true);

      // pins + labels (front hemisphere only, fade near the limb)
      PLACES.forEach((pl, i) => {
        const v = PLACE_V[i];
        rot(v[0], v[1], v[2], tmp);
        if (tmp[2] < 0.08) return;
        const a = Math.min(1, (tmp[2] - 0.08) * 5);
        const x = cx + tmp[0] * R, y = cy - tmp[1] * R;
        ctx.globalAlpha = a;
        drawPin(x, y, R * 0.028, pl.hq, now);
        ctx.globalAlpha = 1;
        drawLabel(x + R * 0.02, y - R * 0.085, pl.name, a);
      });

      raf = visible ? requestAnimationFrame(frame) : 0;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
    io.observe(wrap);

    // subtle parallax tilt toward the pointer
    const onMove = (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      targetTilt.x = nx * 10;
      targetTilt.y = ny * -6;
    };
    if (!reduce) window.addEventListener('pointermove', onMove, { passive: true });

    const onArrive = () => { pulse = 1; };
    window.addEventListener('m360:arrive', onArrive);

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('m360:arrive', onArrive);
    };
  }, []);

  return (
    <div ref={wrapRef} className={`globe ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}

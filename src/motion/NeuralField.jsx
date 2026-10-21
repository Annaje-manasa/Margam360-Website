// Perpetual 3D AI Neural Matrix background field for the Margam AI section:
// rotating 3D particles in space, 3D Cyber Diamond (Octahedron) matrix,
// 3D synaptic laser links with traveling signal pulses, and interactive mouse tilt.
import { useEffect, useRef } from 'react';
import { env, onFrame, state, lerp } from './engine.js';

export default function NeuralField() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    let yaw = 0, pitch = 0;

    // Create 3D particles floating in 3D volume [-320, 320]
    const COUNT = env.mobile ? 42 : 84;
    const particles = Array.from({ length: COUNT }, () => ({
      x: (Math.random() - 0.5) * 640,
      y: (Math.random() - 0.5) * 480,
      z: (Math.random() - 0.5) * 520,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      vz: (Math.random() - 0.5) * 0.45,
      r: 1.2 + Math.random() * 1.8,
      glow: 0,
    }));

    let pulses = [];

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let angleY = 0;
    let angleX = 0.15;

    const draw = (st, dt) => {
      const rect = canvas.getBoundingClientRect();
      const px = st.x - rect.left, py = st.y - rect.top;
      const pointerActive = env.fine && st.pointerActive && px > 0 && py > 0 && px < W && py < H;

      if (pointerActive) {
        const targetYaw = ((px / W) - 0.5) * 0.55;
        const targetPitch = ((py / H) - 0.5) * 0.35;
        yaw = lerp(yaw, targetYaw, 0.08);
        pitch = lerp(pitch, targetPitch, 0.08);
      } else {
        yaw = lerp(yaw, 0, 0.04);
        pitch = lerp(pitch, 0, 0.04);
      }

      if (!env.reduced) {
        angleY += dt * (0.16 + Math.abs(yaw) * 0.2);
        angleX = 0.12 + pitch * 0.3;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const cx = env.mobile ? W / 2 : W * 0.477;
      const cy = env.mobile ? H * 0.48 : H * 0.44;
      const fov = 360;

      // 3D Rotation matrices
      const cosY = Math.cos(angleY + yaw), sinY = Math.sin(angleY + yaw);
      const cosX = Math.cos(angleX + pitch), sinX = Math.sin(angleX + pitch);

      // 1. Draw 3D Floating Cyber Diamond Matrix (3D Octahedron Geometry - Fully Visible)
      const diamondRadius = Math.min(W, H) * 0.14;

      const draw3DDiamond = (r, speed, color, dash = []) => {
        const rotY = angleY * speed;
        const rotX = angleX * (speed * 0.8);
        const cosY2 = Math.cos(rotY), sinY2 = Math.sin(rotY);
        const cosX2 = Math.cos(rotX), sinX2 = Math.sin(rotX);

        // 3D Diamond Vertices (Top apex, Bottom apex, 4 Equator nodes)
        const rawVerts = [
          [0, -r * 1.3, 0],
          [0, r * 1.3, 0],
          [-r, 0, 0],
          [r, 0, 0],
          [0, 0, -r],
          [0, 0, r],
        ];

        const edges = [
          [0, 2], [0, 3], [0, 4], [0, 5],
          [1, 2], [1, 3], [1, 4], [1, 5],
          [2, 4], [4, 3], [3, 5], [5, 2]
        ];

        const proj = rawVerts.map(([vx, vy, vz]) => {
          const x1 = vx * cosY2 + vz * sinY2;
          const z1 = -vx * sinY2 + vz * cosY2;
          const y2 = vy * cosX2 - z1 * sinX2;
          const z2 = vy * sinX2 + z1 * cosX2;

          const scale = fov / (fov + z2 + 320);
          const sx = cx + x1 * scale;
          const sy = cy + y2 * scale;
          return { sx, sy, scale, z2 };
        });

        ctx.beginPath();
        if (dash.length) ctx.setLineDash(dash);
        else ctx.setLineDash([]);

        edges.forEach(([a, b]) => {
          ctx.moveTo(proj[a].sx, proj[a].sy);
          ctx.lineTo(proj[b].sx, proj[b].sy);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.setLineDash([]);

        // Glowing vertex corner nodes
        for (const p of proj) {
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, 3.2 * p.scale, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(p.sx, p.sy, 6 * p.scale, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 90, 75, 0.45)';
          ctx.fill();
        }
      };

      // Draw concentric outer and inner 3D Diamond structures
      draw3DDiamond(diamondRadius * 1.25, 0.65, 'rgba(255, 75, 60, 0.55)', [8, 10]);
      draw3DDiamond(diamondRadius * 0.88, -0.95, 'rgba(255, 120, 105, 0.75)');
      draw3DDiamond(diamondRadius * 0.52, 1.35, 'rgba(255, 220, 210, 0.9)');

      // 2. Project and update 3D Particles
      const projected = [];
      for (const p of particles) {
        if (!env.reduced) {
          p.x += p.vx; p.y += p.vy; p.z += p.vz;
          if (p.x < -320) p.x = 320; else if (p.x > 320) p.x = -320;
          if (p.y < -240) p.y = 240; else if (p.y > 240) p.y = -240;
          if (p.z < -260) p.z = 260; else if (p.z > 260) p.z = -260;
        }

        // Rotate in 3D
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        const scale = fov / (fov + z2 + 300);
        const sx = cx + x1 * scale;
        const sy = cy + y2 * scale;

        // Pointer proximity
        const distP = pointerActive ? Math.hypot(sx - px, sy - py) : 999;
        const glowTarget = distP < 140 ? 1 - distP / 140 : 0;
        p.glow = lerp(p.glow, glowTarget, 0.1);

        projected.push({ p, sx, sy, sz: z2, scale, glow: p.glow });
      }

      // Sort back-to-front for Z-depth depth rendering
      projected.sort((a, b) => b.sz - a.sz);

      // 3. Draw 3D Synaptic Connections
      const LINK_DIST = 115;
      for (let i = 0; i < projected.length; i++) {
        const pA = projected[i];
        for (let j = i + 1; j < projected.length; j++) {
          const pB = projected[j];
          const dx = pA.p.x - pB.p.x, dy = pA.p.y - pB.p.y, dz = pA.p.z - pB.p.z;
          const d3 = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d3 < LINK_DIST) {
            const alpha = (1 - d3 / LINK_DIST) * 0.26 * (pA.scale * 0.8);
            ctx.beginPath();
            ctx.moveTo(pA.sx, pA.sy);
            ctx.lineTo(pB.sx, pB.sy);
            ctx.strokeStyle = `rgba(229, 38, 31, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            if (!env.reduced && pulses.length < 12 && Math.random() < 0.0008) {
              pulses.push({ pA, pB, t: 0 });
            }
          }
        }
      }

      // 4. Render Pulses traveling along 3D links
      pulses = pulses.filter(p => (p.t += dt * 1.2) < 1);
      for (const pulse of pulses) {
        const px = pulse.pA.sx + (pulse.pB.sx - pulse.pA.sx) * pulse.t;
        const py = pulse.pA.sy + (pulse.pB.sy - pulse.pA.sy) * pulse.t;
        const radGlow = ctx.createRadialGradient(px, py, 0, px, py, 6);
        radGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        radGlow.addColorStop(0.5, 'rgba(255, 80, 65, 0.8)');
        radGlow.addColorStop(1, 'rgba(229, 38, 31, 0)');
        ctx.fillStyle = radGlow;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Render 3D Particle Nodes
      for (const item of projected) {
        const { p, sx, sy, scale, glow } = item;
        const size = (p.r * scale) + glow * 2.5;
        const opacity = Math.min(1, Math.max(0.15, (scale - 0.4) * 1.5)) + glow * 0.5;

        if (glow > 0.1) {
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 4);
          g.addColorStop(0, `rgba(255, 90, 75, ${glow * 0.8})`);
          g.addColorStop(1, 'rgba(229, 38, 31, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(sx, sy, size * 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fillStyle = glow > 0.2
          ? '#ffffff'
          : `rgba(255, 200, 195, ${opacity.toFixed(2)})`;
        ctx.fill();
      }
    };

    const stop = onFrame(draw);
    return () => { stop(); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className="neural neural-3d" aria-hidden="true" />;
}

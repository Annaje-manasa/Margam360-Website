import { useEffect, useRef } from 'react';
import { onFrame, lerp } from './engine.js';

export default function AiFeatureBadge3D({ index = 0, label = '01', isActive = false }) {
  const canvasRef = useRef(null);
  const activeRef = useRef(isActive);
  activeRef.current = isActive;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = 42, H = 42, dpr = 1;
    let hoverT = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    resize();

    let rotX = 0.4, rotY = index * 0.8;

    const draw = (st, dt) => {
      const isLit = activeRef.current;
      hoverT = lerp(hoverT, isLit ? 1 : 0, 0.12);
      const speed = 1.1 + hoverT * 2.8;
      rotY += dt * speed;
      rotX += dt * 0.35;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;
      const size = 12 + hoverT * 2.5;
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

      // Glow backdrop
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
      glow.addColorStop(0, `rgba(229, 38, 31, ${0.28 + hoverT * 0.45})`);
      glow.addColorStop(1, 'rgba(229, 38, 31, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // 3D Wireframe Cube for ALL feature numbers (01 styling)
      const vertices = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
      ];
      const edges = [
        [0,1],[1,2],[2,3],[3,0],
        [4,5],[5,6],[6,7],[7,4],
        [0,4],[1,5],[2,6],[3,7]
      ];
      const proj = vertices.map(([x, y, z]) => {
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const sc = 20 / (20 + z2 + 3);
        return [cx + x1 * size * sc * 0.75, cy + y2 * size * sc * 0.75];
      });
      ctx.beginPath();
      edges.forEach(([a, b]) => {
        ctx.moveTo(proj[a][0], proj[a][1]);
        ctx.lineTo(proj[b][0], proj[b][1]);
      });
      ctx.strokeStyle = isLit ? '#ffffff' : 'rgba(255, 90, 75, 0.85)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    };

    const stop = onFrame(draw);
    return () => {
      stop();
    };
  }, [index]);

  return (
    <div className="ai-idx-3d-wrap" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <canvas ref={canvasRef} style={{ width: '42px', height: '42px', display: 'block' }} aria-hidden="true" />
      <span className="ai-idx" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, pointerEvents: 'none' }}>
        {label}
      </span>
    </div>
  );
}

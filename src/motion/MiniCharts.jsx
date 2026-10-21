import { useEffect, useRef } from 'react';
import { whileVisible } from './engine.js';

/* ---------------- 01: Performance Advertising Horizontal Lines ---------------- */
export function MiniPerfCpaDrop({ className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // 5 horizontal rounded pill lines matching screenshot
    const widths = [0.94, 0.88, 0.68, 0.74, 0.38];

    const draw = (st) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const numBars = widths.length;
      const gap = 5;
      const barH = Math.max(3, (H - (numBars - 1) * gap) / numBars);
      const timeSec = st.time / 1000;

      widths.forEach((baseW, i) => {
        const pulse = Math.sin(timeSec * 3 + i * 0.9) * 0.04;
        const wRatio = Math.min(1, Math.max(0.12, baseW + pulse));
        const barW = Math.max(barH, W * wRatio);
        const y = i * (barH + gap);

        const grad = ctx.createLinearGradient(0, y, barW, y);
        grad.addColorStop(0, '#e5261f');
        grad.addColorStop(0.7, '#ff4a3d');
        grad.addColorStop(1, '#ff6b5d');

        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(0, y, barW, barH, barH / 2);
        else ctx.rect(0, y, barW, barH);
        ctx.fill();

        // Glowing end cap
        ctx.shadowColor = 'rgba(255, 74, 61, 0.9)';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(barW - barH / 2, y + barH / 2, barH / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    };

    const stop = whileVisible(canvas, draw);
    return () => { stop(); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className={`mini-chart ${className}`} aria-hidden="true" />;
}

/* ---------------- 02: SEO & Content (Top 3 Rank Climb) ---------------- */
export function MiniSeoRankClimb({ className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (st) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const timeSec = st.time / 1000;

      // Ranking steps climbing up to position #1 / Top 3
      const steps = 4;
      const stepW = (W - (steps - 1) * 6) / steps;

      for (let i = 0; i < steps; i++) {
        // Higher step = better ranking
        const stepRatio = 0.25 + i * 0.23;
        const pulse = Math.sin(timeSec * 2.5 + i * 0.8) * 2;
        const barH = Math.max(4, stepRatio * (H - 4) + pulse);
        const x = i * (stepW + 6);
        const y = H - barH;

        const grad = ctx.createLinearGradient(0, y, 0, H);
        grad.addColorStop(0, '#ff4a3d');
        grad.addColorStop(1, 'rgba(229, 38, 31, 0.15)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, stepW, barH, [3, 3, 0, 0]);
        else ctx.rect(x, y, stepW, barH);
        ctx.fill();

        // Search lens icon on the top #1 step
        if (i === steps - 1) {
          ctx.beginPath();
          ctx.arc(x + stepW / 2, y + 4, 3.5, 0, Math.PI * 2);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(x + stepW / 2, y + 4, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      }
    };

    const stop = whileVisible(canvas, draw);
    return () => { stop(); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className={`mini-chart ${className}`} aria-hidden="true" />;
}

/* ---------------- 03: Conversion Optimisation (+100% Sales Doubler) ---------------- */
export function MiniCroDoubler({ className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (st) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const timeSec = st.time / 1000;

      // 2 main columns: Before (1X) vs Rebuilt Checkout (2X = +100%)
      const colW = W * 0.38;
      const gap = W * 0.18;

      // Column 1: Baseline Sales 1X
      const h1 = (H - 4) * 0.42;
      const y1 = H - h1;
      const g1 = ctx.createLinearGradient(0, y1, 0, H);
      g1.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      g1.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      ctx.fillStyle = g1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(0, y1, colW, h1, [4, 4, 0, 0]);
      else ctx.rect(0, y1, colW, h1);
      ctx.fill();

      // Column 2: Rebuilt CRO Sales 2X (+100% Sales)
      const pulse = Math.sin(timeSec * 3) * 3;
      const h2 = Math.min(H - 4, (H - 4) * 0.88 + pulse);
      const x2 = colW + gap;
      const y2 = H - h2;
      const g2 = ctx.createLinearGradient(0, y2, 0, H);
      g2.addColorStop(0, '#ff4a3d');
      g2.addColorStop(0.5, '#e5261f');
      g2.addColorStop(1, 'rgba(229, 38, 31, 0.2)');
      ctx.fillStyle = g2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x2, y2, colW, h2, [4, 4, 0, 0]);
      else ctx.rect(x2, y2, colW, h2);
      ctx.fill();

      // Connecting Upward Multiplier Arrow (+100%)
      const arrowX = colW + gap / 2;
      ctx.beginPath();
      ctx.moveTo(arrowX, H * 0.7);
      ctx.lineTo(arrowX, H * 0.25);
      ctx.lineTo(arrowX + 4, H * 0.38);
      ctx.moveTo(arrowX, H * 0.25);
      ctx.lineTo(arrowX - 4, H * 0.38);
      ctx.strokeStyle = '#ff4a3d';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const stop = whileVisible(canvas, draw);
    return () => { stop(); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className={`mini-chart ${className}`} aria-hidden="true" />;
}

/* ---------------- 04: Email & Automation (Lifecycle Journey Flow) ---------------- */
export function MiniEmailSequence({ className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (st) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const timeSec = st.time / 1000;

      // 3 Lifecycle Journey Nodes: Welcome -> Nurture -> Re-engage
      const nodes = [
        { x: W * 0.15, y: H * 0.7, label: 'Welcome' },
        { x: W * 0.5, y: H * 0.35, label: 'Nurture' },
        { x: W * 0.85, y: H * 0.55, label: 'Win-back' },
      ];

      // Bezier Flow Path
      ctx.beginPath();
      ctx.moveTo(nodes[0].x, nodes[0].y);
      ctx.quadraticCurveTo(W * 0.32, H * 0.2, nodes[1].x, nodes[1].y);
      ctx.quadraticCurveTo(W * 0.68, H * 0.65, nodes[2].x, nodes[2].y);
      ctx.strokeStyle = 'rgba(229, 38, 31, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Moving Email Pulse Signal
      const progress = (timeSec * 0.7) % 1;
      let px, py;
      if (progress < 0.5) {
        const t = progress / 0.5;
        px = Math.pow(1 - t, 2) * nodes[0].x + 2 * (1 - t) * t * (W * 0.32) + t * t * nodes[1].x;
        py = Math.pow(1 - t, 2) * nodes[0].y + 2 * (1 - t) * t * (H * 0.2) + t * t * nodes[1].y;
      } else {
        const t = (progress - 0.5) / 0.5;
        px = Math.pow(1 - t, 2) * nodes[1].x + 2 * (1 - t) * t * (W * 0.68) + t * t * nodes[2].x;
        py = Math.pow(1 - t, 2) * nodes[1].y + 2 * (1 - t) * t * (H * 0.65) + t * t * nodes[2].y;
      }

      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ff4a3d';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Envelope Nodes
      nodes.forEach((n) => {
        ctx.fillStyle = '#e5261f';
        ctx.fillRect(n.x - 5, n.y - 4, 10, 8);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(n.x - 5, n.y - 4, 10, 8);
      });
    };

    const stop = whileVisible(canvas, draw);
    return () => { stop(); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className={`mini-chart ${className}`} aria-hidden="true" />;
}

/* ---------------- 05: Social Media Marketing (3X Multi-Stream Traffic) ---------------- */
export function MiniSocialMultiStream({ className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (st) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const timeSec = st.time / 1000;

      // 3 Social Streams (Instagram, Facebook, LinkedIn) converging to 3X Traffic
      const streams = [
        { startY: H * 0.2, color: '#ff4a3d' },
        { startY: H * 0.5, color: '#e5261f' },
        { startY: H * 0.8, color: 'rgba(255, 255, 255, 0.7)' },
      ];

      const endX = W * 0.95;
      const endY = H * 0.35;

      streams.forEach((s, idx) => {
        const wave = Math.sin(timeSec * 3 + idx * 1.5) * 3;
        ctx.beginPath();
        ctx.moveTo(W * 0.05, s.startY);
        ctx.bezierCurveTo(W * 0.35, s.startY + wave, W * 0.65, endY - wave, endX, endY);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Node dots at source
        ctx.beginPath();
        ctx.arc(W * 0.05, s.startY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
      });

      // Converged Traffic Growth Spike
      const spikeR = 4 + Math.sin(timeSec * 4) * 1.5;
      ctx.beginPath();
      ctx.arc(endX, endY, spikeR, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4a3d';
      ctx.shadowColor = '#ff4a3d';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const stop = whileVisible(canvas, draw);
    return () => { stop(); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className={`mini-chart ${className}`} aria-hidden="true" />;
}

/* ---------------- 06: WhatsApp Marketing (+45% Reply Pulse Wave) ---------------- */
export function MiniWhatsappChatFlow({ className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (st) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const timeSec = st.time / 1000;

      // Broadcast message -> Instant customer reply pulse bars (+45% reply rate)
      const numBars = 14;
      const gap = 4;
      const barW = Math.max(2.5, (W - (numBars - 1) * gap) / numBars);

      for (let i = 0; i < numBars; i++) {
        const norm = i / numBars;
        // Reply pulse effect moving across
        const pulse = Math.sin(timeSec * 6 - norm * 10) * 0.4;
        const hRatio = Math.max(0.15, Math.min(0.95, 0.35 + pulse));
        const barH = (H - 4) * hRatio;
        const x = i * (barW + gap);
        const y = (H - barH) / 2;

        ctx.fillStyle = i % 3 === 0 ? '#e5261f' : '#ff4a3d'; // Website brand red colorcodes (--red & --red-hi)
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, barW, barH, 2);
        else ctx.rect(x, y, barW, barH);
        ctx.fill();
      }
    };

    const stop = whileVisible(canvas, draw);
    return () => { stop(); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className={`mini-chart ${className}`} aria-hidden="true" />;
}

/* ---------------- Selector Component ---------------- */
export function MiniChartSelector({ no }) {
  switch (no) {
    case '01':
      return <MiniPerfCpaDrop />;
    case '02':
      return <MiniSeoRankClimb />;
    case '03':
      return <MiniCroDoubler />;
    case '04':
      return <MiniEmailSequence />;
    case '05':
      return <MiniSocialMultiStream />;
    case '06':
      return <MiniWhatsappChatFlow />;
    default:
      return <MiniPerfCpaDrop />;
  }
}

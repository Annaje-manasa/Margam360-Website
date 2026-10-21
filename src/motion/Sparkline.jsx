// Single-series area chart for the (illustrative) growth console:
// draws itself on reveal, emphasised endpoint, faint grid, crosshair + tooltip on hover.
import { useMemo, useRef, useState, useEffect } from 'react';

const W = 480, H = 118, PAD = { l: 4, r: 52, t: 12, b: 14 };

export default function Sparkline({ data, label = 'Qualified leads per week', unit = 'leads' }) {
  const [hover, setHover] = useState(null);
  const [time, setTime] = useState(0);
  const svgRef = useRef(null);

  const max = Math.max(...data) * 1.1, min = 0;
  const x = (i) => PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);

  const targetVal = data[data.length - 1];
  const [countVal, setCountVal] = useState(0);
  const [animProgress, setAnimProgress] = useState(0);

  // Dynamic animation loop for real-time wave motion & count up
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let startTime = null;
    let frameId;

    const animate = (now) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;

      if (!reduce) {
        const progress = Math.min(1, elapsed / 1800);
        const ease = 1 - Math.pow(1 - progress, 3);
        setCountVal(Math.round(ease * targetVal));
        setAnimProgress(progress);
      } else {
        setCountVal(targetVal);
        setAnimProgress(1);
      }

      setTime(elapsed / 1000);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [targetVal]);

  const { line, area, points } = useMemo(() => {
    // smooth curve starting at 0 height baseline point on left origin
    const pointsData = [0, ...data];
    const p = pointsData.map((v, i) => [
      PAD.l + (i / (pointsData.length - 1)) * (W - PAD.l - PAD.r),
      y(v),
    ]);

    let d = `M${p[0][0]},${p[0][1]}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }

    return {
      line: d,
      area: `${d} L${p[p.length - 1][0]},${H - PAD.b} L${p[0][0]},${H - PAD.b} Z`,
      points: p,
    };
  }, [data]);

  const onMove = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((sx - PAD.l) / (W - PAD.l - PAD.r)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  const last = data.length - 1;
  const hv = hover ?? last;
  const grid = [0.25, 0.5, 0.75].map((f) => PAD.t + f * (H - PAD.t - PAD.b));

  const isCounting = animProgress < 1;
  // Line grows along with point while count is increasing.
  // Once count stops, line becomes completely static, and only the point moves.
  const travelT = isCounting ? animProgress : (time * 0.35) % 1;
  const numSegs = points.length - 1;
  const segIdx = Math.min(numSegs - 1, Math.floor(travelT * numSegs));
  const segProgress = (travelT * numSegs) % 1;
  const pA = points[segIdx];
  const pB = points[segIdx + 1] || pA;
  const signalX = pA[0] + (pB[0] - pA[0]) * segProgress;
  const signalY = pA[1] + (pB[1] - pA[1]) * segProgress;

  const clipWidth = isCounting ? signalX : W;
  const endY = points[points.length - 1][1];

  return (
    <figure className="spark-chart">
      <figcaption>
        <span>{label}</span>
        <span className="spark-range">Last {data.length} weeks</span>
      </figcaption>
      <div className="spark-wrap">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`${label}: from 0 to ${data[last]} over ${data.length} weeks`}
          onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e5261f" stopOpacity="0.34" />
              <stop offset="1" stopColor="#e5261f" stopOpacity="0" />
            </linearGradient>
            <clipPath id="spark-reveal-clip">
              <rect x="0" y="0" width={clipWidth} height={H} />
            </clipPath>
          </defs>
          {grid.map((g) => <line key={g} x1={PAD.l} x2={W - PAD.r} y1={g} y2={g} className="spark-grid" />)}
          <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="spark-base" />
          <path d={area} fill="url(#spark-fill)" className="spark-area" clipPath="url(#spark-reveal-clip)" />
          <path d={line} pathLength="1" className="spark-line" fill="none" clipPath="url(#spark-reveal-clip)" />
          <circle cx={signalX} cy={signalY} r="3" fill="#ffffff" style={{ filter: 'drop-shadow(0 0 6px #ff4a3d)' }} />
          {hover !== null && <line x1={x(hv)} x2={x(hv)} y1={PAD.t} y2={H - PAD.b} className="spark-cross" />}
          <circle cx={x(hv)} cy={y(data[hv])} r="7" className="spark-halo" />
          <circle cx={x(hv)} cy={y(data[hv])} r="3.5" className="spark-dot" />
          <text x={W - PAD.r + 6} y={endY + 4} className="spark-end">{countVal.toLocaleString('en-IN')}</text>
          {/* invisible hit area larger than the marks */}
          <rect x="0" y="0" width={W} height={H} fill="transparent" />
        </svg>
        {hover !== null && (
          <div className="spark-tip" style={{ left: `${(x(hv) / W) * 100}%`, top: `${(y(data[hv]) / H) * 100}%` }}>
            <b>{data[hv].toLocaleString('en-IN')}</b> {unit}<small>Week {hv + 1}</small>
          </div>
        )}
      </div>
    </figure>
  );
}

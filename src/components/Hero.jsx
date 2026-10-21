import { useRef } from 'react';
import Globe from './Globe.jsx';
import FlightPath from './FlightPath.jsx';
import CountUp from './CountUp.jsx';
import { HERO_STATS } from '../data/content.js';

export default function Hero() {
  const heroRef = useRef(null);
  const globeRef = useRef(null);
  return (
    <section className="hero" id="top" ref={heroRef}>
      <div className="hero-grid-bg" aria-hidden="true" />
      <FlightPath heroRef={heroRef} globeRef={globeRef} />


      <div className="container hero-inner">
        <div className="hero-copy">
          <p className="eyebrow eyebrow-pill">
            <span className="live-dot" aria-hidden="true" />
            Hyderabad’s #1 Performance Marketing Agency
          </p>
          <h1 className="hero-title">
            <span className="line">Explode Your</span>
            <span className="line accent">Revenue.</span>
          </h1>
          <p className="hero-sub">
            We don’t just run campaigns — we engineer compounding growth for ambitious brands.
            Your AI-powered 360° marketing partner, from strategy to scale, across India and the US.
          </p>
          <div className="hero-ctas">
            <a href="#booking" className="btn btn-primary">
              Start my free strategy call
            </a>
            <a href="#services" className="btn-link">
              See what you get <span aria-hidden="true">→</span>
            </a>
          </div>
          <dl className="hero-stats">
            {HERO_STATS.map((s) => (
              <div key={s.label}>
                <dt><CountUp value={s.value} suffix={s.suffix} decimals={s.decimals || 0} /></dt>
                <dd>{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="hero-visual" ref={globeRef}>
          <Globe />
        </div>
      </div>

      <a href="#services" className="scroll-cue" aria-label="Scroll to services">
        <span>Scroll</span>
        <i aria-hidden="true" />
      </a>
    </section>
  );
}

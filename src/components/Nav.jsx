import { useEffect, useState } from 'react';
import Logo from './Logo.jsx';
import { NAV } from '../data/content.js';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`nav ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <div className="nav-inner">
        <Logo />
        <nav className="nav-links" aria-label="Primary">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)}>{n.label}</a>
          ))}
        </nav>
        <a href="#booking" className="btn btn-sm nav-cta">
          Book a call <span aria-hidden="true">↗</span>
        </a>
        <button className="nav-toggle" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span /><span />
        </button>
      </div>
    </header>
  );
}

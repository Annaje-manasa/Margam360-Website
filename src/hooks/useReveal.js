import { useEffect } from 'react';

// Adds `.is-in` to every `[data-reveal]` element when it scrolls into view, then
// `.is-done` once its entrance has finished (so hover effects respond instantly).
export default function useReveal() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reveal = (el) => {
      if (el.classList.contains('is-in')) return;
      el.classList.add('is-in');
      const d = parseFloat(el.style.getPropertyValue('--d')) || 0;
      setTimeout(() => el.classList.add('is-done'), reduced ? 0 : 1300 + d);
    };
    const all = () => document.querySelectorAll('[data-reveal]:not(.is-in)');

    if (reduced) {
      all().forEach(reveal);
      const mo = new MutationObserver(() => all().forEach(reveal));
      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    }

    document.documentElement.classList.add('js-reveal');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); }
      }),
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
    );
    const track = (el) => {
      // anything already on screen is shown immediately
      if (el.getBoundingClientRect().top < window.innerHeight) reveal(el);
      else io.observe(el);
    };
    all().forEach(track);
    // elements that mount later (e.g. the booking form after "Edit details")
    const mo = new MutationObserver(() => all().forEach(track));
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}

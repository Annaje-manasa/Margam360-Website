// In-memory rate limiting — per visitor IP (minute + day windows) and a global
// daily cap that protects your API bill. Fine for a single server instance;
// if you run several instances, back this with Redis/Upstash instead.
export function createLimiter({ perMinute, perDay, globalPerDay }) {
  const ips = new Map(); // ip -> { minute: [timestamps], day, dayStart }
  let global = { count: 0, dayStart: dayStart() };

  function dayStart() { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d.getTime(); }

  setInterval(() => { // housekeeping
    const cutoff = Date.now() - 86_400_000;
    for (const [ip, r] of ips) if (r.dayStart < cutoff && !r.minute.length) ips.delete(ip);
  }, 600_000).unref();

  return {
    check(ip = 'unknown') {
      const now = Date.now();
      const today = dayStart();
      if (global.dayStart !== today) global = { count: 0, dayStart: today };
      if (global.count >= globalPerDay) return { ok: false, retryAfter: Math.ceil((today + 86_400_000 - now) / 1000) };

      let r = ips.get(ip);
      if (!r || r.dayStart !== today) { r = { minute: [], day: 0, dayStart: today }; ips.set(ip, r); }
      r.minute = r.minute.filter((t) => now - t < 60_000);
      if (r.minute.length >= perMinute) return { ok: false, retryAfter: Math.ceil((60_000 - (now - r.minute[0])) / 1000) };
      if (r.day >= perDay) return { ok: false, retryAfter: Math.ceil((today + 86_400_000 - now) / 1000) };

      r.minute.push(now);
      r.day += 1;
      global.count += 1;
      return { ok: true };
    },
  };
}

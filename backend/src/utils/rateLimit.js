/** Small in-memory limiter (per server process). Good enough to slow down password guessing and order spam. */
export function createLimiter({ windowMs, max }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }, Math.min(windowMs, 60_000));
  timer.unref();

  const entry = (key) => {
    const now = Date.now();
    let e = hits.get(key);
    if (!e || e.resetAt <= now) { e = { count: 0, resetAt: now + windowMs }; hits.set(key, e); }
    return e;
  };
  return {
    /** Returns seconds to wait if the key is over the limit, otherwise 0. */
    retryAfter(key) {
      const e = entry(key);
      return e.count >= max ? Math.ceil((e.resetAt - Date.now()) / 1000) : 0;
    },
    hit(key) { entry(key).count++; },
    reset(key) { hits.delete(key); },
  };
}

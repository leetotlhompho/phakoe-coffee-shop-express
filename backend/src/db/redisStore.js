/**
 * Same interface as the file store, backed by a Redis-compatible key-value database
 * (for example a free Upstash Redis). Redis keeps the data outside the web server, so it
 * persists across restarts and re-deploys even on hosts with a temporary file system.
 */
export async function createRedisStore(url) {
  let Redis;
  try {
    ({ default: Redis } = await import("ioredis"));
  } catch {
    throw new Error("REDIS_URL is set but the 'ioredis' package is not installed. Run: npm install ioredis");
  }
  const redis = new Redis(url, { maxRetriesPerRequest: 3 });
  const PREFIX = "brewhaven:";
  const k = (key) => PREFIX + key;
  const parse = (s) => (s === null || s === undefined ? null : JSON.parse(s));

  // Per-key queue so read-modify-write updates from this server never interleave.
  const tails = new Map();
  function withLock(key, task) {
    const prev = tails.get(key) || Promise.resolve();
    const run = prev.then(task);
    const tail = run.catch(() => {});
    tails.set(key, tail);
    tail.then(() => { if (tails.get(key) === tail) tails.delete(key); });
    return run;
  }

  await redis.ping();
  return {
    kind: "redis",
    async get(key) { return parse(await redis.get(k(key))); },
    async set(key, value) { await redis.set(k(key), JSON.stringify(value)); return value; },
    async create(key, value) { return (await redis.set(k(key), JSON.stringify(value), "NX")) === "OK"; },
    update(key, fn) {
      return withLock(key, async () => {
        const current = parse(await redis.get(k(key)));
        if (current === null) return null;
        const next = fn(current);
        await redis.set(k(key), JSON.stringify(next));
        return next;
      });
    },
    async delete(key) { return (await redis.del(k(key))) > 0; },
    async list(prefix) {
      const keys = new Set();
      let cursor = "0";
      do {
        const [next, batch] = await redis.scan(cursor, "MATCH", `${PREFIX}${prefix}*`, "COUNT", 200);
        cursor = next;
        batch.forEach((key) => keys.add(key));
      } while (cursor !== "0");
      if (!keys.size) return [];
      return (await redis.mget(...keys)).map(parse).filter((v) => v !== null);
    },
    async ping() { return (await redis.ping()) === "PONG"; },
    async close() { await redis.quit(); },
  };
}

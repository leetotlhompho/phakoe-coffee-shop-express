import fs from "node:fs";
import path from "node:path";

/**
 * Key-value store kept in memory and written to a JSON file after every change.
 * Writes are atomic (temp file + rename) and queued, so data survives restarts and
 * a crash in the middle of a write cannot corrupt the existing file.
 */
export async function createFileStore(file) {
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  const map = new Map();

  try {
    const raw = await fs.promises.readFile(file, "utf8");
    if (raw.trim()) {
      const parsed = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) map.set(k, v);
    }
  } catch (err) {
    if (err.code !== "ENOENT") {
      const backup = `${file}.corrupt-${Date.now()}`;
      await fs.promises.rename(file, backup).catch(() => {});
      console.error(`[db] Could not read ${file} (${err.message}). Moved it to ${backup} and starting empty.`);
    }
  }

  let chain = Promise.resolve();
  const persist = () => {
    chain = chain.then(async () => {
      const tmp = `${file}.tmp`;
      await fs.promises.writeFile(tmp, JSON.stringify(Object.fromEntries(map)), "utf8");
      await fs.promises.rename(tmp, file);
    });
    return chain;
  };
  const copy = (v) => (v === undefined ? undefined : structuredClone(v));

  return {
    kind: "file",
    async get(key) { return copy(map.get(key)) ?? null; },
    async set(key, value) { map.set(key, copy(value)); await persist(); return value; },
    /** Stores the value only if the key does not exist yet. Returns false when it already exists. */
    async create(key, value) {
      if (map.has(key)) return false;
      map.set(key, copy(value));
      await persist();
      return true;
    },
    /** Reads, changes and writes one record. fn receives the current value and returns the new one. Returns null if missing. */
    async update(key, fn) {
      if (!map.has(key)) return null;
      const next = fn(copy(map.get(key)));
      map.set(key, copy(next));
      await persist();
      return copy(next);
    },
    async delete(key) {
      const existed = map.delete(key);
      if (existed) await persist();
      return existed;
    },
    async list(prefix) {
      const out = [];
      for (const [k, v] of map) if (k.startsWith(prefix)) out.push(copy(v));
      return out;
    },
    async ping() { return true; },
    async close() { await chain; },
  };
}

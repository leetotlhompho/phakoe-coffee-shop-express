import http from "node:http";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createStore } from "./db/index.js";
import { seedMenuIfNeeded } from "./seed.js";
import { createUserService } from "./services/userService.js";

const config = loadConfig();
const store = await createStore(config);

const seeded = await seedMenuIfNeeded(store);
if (seeded) console.log(`[seed] Loaded ${seeded} sample menu items.`);
await createUserService(store).ensureAdmin(config);

const server = http.createServer(createApp({ store, config }));
server.listen(config.port, () => {
  console.log(`Phakoe's Coffee Shop Express API listening on port ${config.port} (database: ${store.kind})`);
  if (store.kind === "file" && config.isProd) {
    console.warn(`[db] Using a file at ${config.dataFile}. On Render this only persists on a persistent disk - or set REDIS_URL.`);
  }
});

// Finish saving data before the process exits (Render sends SIGTERM when restarting).
async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await store.close().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

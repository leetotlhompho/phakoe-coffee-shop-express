import path from "node:path";

const DEV_ORIGINS = ["http://localhost:5173", "http://localhost:4173", "http://127.0.0.1:5173"];
const list = (v) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);

/** Reads environment variables once and validates them. Overrides are used by the tests. */
export function loadConfig(overrides = {}) {
  const env = process.env;
  const isProd = env.NODE_ENV === "production";
  const cfg = {
    isProd,
    port: Number(env.PORT) || 4000,
    redisUrl: env.REDIS_URL || "",
    dataFile: path.resolve(env.DATA_FILE || "./data/brewhaven-db.json"),
    jwtSecret: env.JWT_SECRET || "",
    tokenTtlHours: Number(env.TOKEN_TTL_HOURS) || 8,
    allowedOrigins: list(env.ALLOWED_ORIGINS).length ? list(env.ALLOWED_ORIGINS) : isProd ? [] : DEV_ORIGINS,
    adminName: env.ADMIN_NAME || "Phakoe's Coffee Shop Express Administrator",
    adminEmail: env.ADMIN_EMAIL || "",
    adminPassword: env.ADMIN_PASSWORD || "",
    trustProxy: env.TRUST_PROXY ? Number(env.TRUST_PROXY) : isProd ? 1 : 0,
    loginLimit: { windowMs: 15 * 60 * 1000, max: 10 },
    orderLimit: { windowMs: 10 * 60 * 1000, max: 40 },
    ...overrides,
  };

  if (isProd && cfg.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be set to a random string of at least 32 characters in production.");
  }
  if (!cfg.jwtSecret) {
    cfg.jwtSecret = "dev-only-secret-do-not-use-in-production-0123456789";
    console.warn("[config] JWT_SECRET not set - using an insecure development secret.");
  }
  if (!isProd) {
    cfg.adminEmail ||= "admin@brewhaven.local";
    cfg.adminPassword ||= "Admin123!";
  }
  return cfg;
}

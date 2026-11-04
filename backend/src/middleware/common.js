import { AppError, notFound, tooManyRequests } from "../utils/errors.js";

export function securityHeaders(req, res, next) {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "no-referrer");
  res.set("Cache-Control", "no-store");
  next();
}

/** Allows only the configured websites (ALLOWED_ORIGINS) to call the API from a browser. Supports * wildcards. */
export function cors(allowedOrigins) {
  const matchers = allowedOrigins.map((o) => {
    if (!o.includes("*")) return (origin) => origin === o;
    const re = new RegExp("^" + o.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*") + "$");
    return (origin) => re.test(origin);
  });
  return (req, res, next) => {
    const origin = req.headers.origin;
    res.set("Vary", "Origin");
    if (origin && matchers.some((m) => m(origin))) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.set("Access-Control-Max-Age", "600");
    }
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  };
}

/** Lets async route handlers pass errors to the error handler (Express 4 does not do this by itself). */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function limitRequests(limiter, message = "Too many requests. Please wait a moment and try again.") {
  return (req, res, next) => {
    const wait = limiter.retryAfter(req.ip);
    if (wait) return next(tooManyRequests(message, wait));
    limiter.hit(req.ip);
    next();
  };
}

export function apiNotFound(req, res, next) {
  next(notFound(`No endpoint for ${req.method} ${req.originalUrl.split("?")[0]}.`));
}

/** One consistent error format for every failure: { "error": { "code", "message", "details"? } } */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  let status = 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong on the server. Please try again.";
  let details;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
    if (err.retryAfter) res.set("Retry-After", String(err.retryAfter));
  } else if (err?.type === "entity.parse.failed") {
    status = 400; code = "INVALID_JSON"; message = "The request body is not valid JSON.";
  } else if (err?.type === "entity.too.large") {
    status = 413; code = "PAYLOAD_TOO_LARGE"; message = "The request body is too large.";
  } else {
    console.error("[error]", err);
  }
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}

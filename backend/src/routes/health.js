import express from "express";
import { wrap } from "../middleware/common.js";

export function healthRoutes({ store }) {
  const r = express.Router();
  // GET /api/health - lets Render (and you) check the API and its database are up.
  r.get("/", wrap(async (req, res) => {
    let dbOk = false;
    try { dbOk = await store.ping(); } catch { dbOk = false; }
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? "ok" : "degraded",
      database: dbOk ? `connected (${store.kind})` : "unreachable",
      uptimeSeconds: Math.round(process.uptime()),
      time: new Date().toISOString(),
    });
  }));
  return r;
}

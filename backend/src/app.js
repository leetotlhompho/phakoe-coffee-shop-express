import express from "express";
import { createAuth } from "./middleware/auth.js";
import { apiNotFound, cors, errorHandler, securityHeaders } from "./middleware/common.js";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";
import { menuRoutes } from "./routes/menu.js";
import { ordersRoutes } from "./routes/orders.js";
import { staffRoutes } from "./routes/staff.js";

/** Builds the Express application. The store and config are passed in so tests can use a temporary database. */
export function createApp({ store, config }) {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", config.trustProxy);

  app.use(securityHeaders);
  app.use(cors(config.allowedOrigins));
  app.use(express.json({ limit: "20kb" }));

  const ctx = { store, config };
  const auth = createAuth(ctx);

  app.get("/", (req, res) => res.json({ name: "Phakoe's Coffee Shop Express API", status: "running", health: "/api/health" }));
  app.use("/api/health", healthRoutes(ctx));
  app.use("/api/auth", authRoutes(ctx, auth));
  app.use("/api/menu", menuRoutes(ctx, auth));
  app.use("/api/orders", ordersRoutes(ctx, auth));
  app.use("/api/staff", staffRoutes(ctx, auth));

  app.use("/api", apiNotFound);
  app.use(errorHandler);
  return app;
}

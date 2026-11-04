import express from "express";
import { wrap } from "../middleware/common.js";
import { publicUser } from "../middleware/auth.js";
import { createUserService } from "../services/userService.js";
import { createLimiter } from "../utils/rateLimit.js";
import { tooManyRequests } from "../utils/errors.js";
import { signToken } from "../utils/security.js";
import { validateLogin } from "../utils/validate.js";

export function authRoutes({ store, config }, auth) {
  const r = express.Router();
  const users = createUserService(store);
  const limiter = createLimiter(config.loginLimit);

  // POST /api/auth/login  { email, password } -> { token, expiresAt, user }
  r.post("/login", wrap(async (req, res) => {
    const { email, password } = validateLogin(req.body);
    const wait = limiter.retryAfter(req.ip);
    if (wait) throw tooManyRequests("Too many failed sign-in attempts. Please try again later.", wait);
    let user;
    try {
      user = await users.authenticate(email, password);
    } catch (err) {
      limiter.hit(req.ip);
      throw err;
    }
    limiter.reset(req.ip);
    const { token, expiresAt } = signToken({ sub: user.id, role: user.role }, config.jwtSecret, config.tokenTtlHours * 3600);
    res.json({ token, expiresAt, user: publicUser(user) });
  }));

  // GET /api/auth/me - who am I? Also used by the website to check a saved sign-in.
  r.get("/me", auth.staff, (req, res) => res.json(req.user));
  return r;
}

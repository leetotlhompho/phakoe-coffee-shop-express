import express from "express";
import { wrap } from "../middleware/common.js";
import { publicUser } from "../middleware/auth.js";
import { createUserService } from "../services/userService.js";
import { createLimiter } from "../utils/rateLimit.js";
import { tooManyRequests } from "../utils/errors.js";
import { signToken } from "../utils/security.js";
import { validateChangePassword, validateLogin } from "../utils/validate.js";

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
    // An administrator who still signs in with the starting password from the settings is asked to change it.
    if (user.role === "admin" && config.adminPassword && password === config.adminPassword) user.mustChangePassword = true;
    const { token, expiresAt } = signToken({ sub: user.id, role: user.role, pv: user.passwordVersion || 0 }, config.jwtSecret, config.tokenTtlHours * 3600);
    res.json({ token, expiresAt, user: publicUser(user) });
  }));

  // GET /api/auth/me - who am I? Also used by the website to check a saved sign-in.
  r.get("/me", auth.staff, (req, res) => res.json(req.user));

  // POST /api/auth/change-password  { currentPassword, newPassword } - any signed-in staff member or admin.
  // Returns a fresh token, because older sign-in tokens stop working once the password changes.
  r.post("/change-password", auth.staff, wrap(async (req, res) => {
    const wait = limiter.retryAfter(`pw:${req.user.id}`);
    if (wait) throw tooManyRequests("Too many wrong attempts. Please try again later.", wait);
    const { currentPassword, newPassword } = validateChangePassword(req.body);
    let updated;
    try {
      updated = await users.changePassword(req.user.id, currentPassword, newPassword);
    } catch (err) {
      limiter.hit(`pw:${req.user.id}`);
      throw err;
    }
    limiter.reset(`pw:${req.user.id}`);
    const { token, expiresAt } = signToken({ sub: updated.id, role: updated.role, pv: updated.passwordVersion || 0 }, config.jwtSecret, config.tokenTtlHours * 3600);
    res.json({ token, expiresAt, user: publicUser(updated) });
  }));
  return r;
}

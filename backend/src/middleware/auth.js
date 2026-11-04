import { forbidden, unauthorized } from "../utils/errors.js";
import { verifyToken } from "../utils/security.js";
import { isSafeId } from "../utils/ids.js";
import { wrap } from "./common.js";

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt });

/**
 * Authentication (who are you?) and authorisation (are you allowed?).
 * The user is loaded from the database on every request, so a removed staff account loses access immediately,
 * and the role always comes from the database rather than from the token.
 */
export function createAuth({ store, config }) {
  async function loadUser(req) {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) return null;
    const payload = verifyToken(header.slice(7), config.jwtSecret);
    if (!payload || !isSafeId(payload.sub)) return null;
    return store.get(`user:${payload.sub}`);
  }

  /** Requires a signed-in staff member or administrator. */
  const staff = wrap(async (req, res, next) => {
    const user = await loadUser(req);
    if (!user) throw unauthorized("Please sign in with a valid staff account.");
    req.user = publicUser(user);
    next();
  });

  /** Requires an administrator. */
  const admin = wrap(async (req, res, next) => {
    const user = await loadUser(req);
    if (!user) throw unauthorized("Please sign in with a valid staff account.");
    if (user.role !== "admin") throw forbidden("Only the administrator can do that.");
    req.user = publicUser(user);
    next();
  });

  /** Signed in or not - sets req.user when a valid token is present. */
  const optional = wrap(async (req, res, next) => {
    const user = await loadUser(req);
    if (user) req.user = publicUser(user);
    next();
  });

  return { staff, admin, optional };
}

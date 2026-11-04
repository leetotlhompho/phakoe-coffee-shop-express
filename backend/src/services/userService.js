import { conflict, forbidden, notFound, unauthorized } from "../utils/errors.js";
import { isSafeId, newUserId } from "../utils/ids.js";
import { DUMMY_HASH, hashPassword, verifyPassword } from "../utils/security.js";
import { validateStaffInput } from "../utils/validate.js";
import { publicUser } from "../middleware/auth.js";

export function createUserService(store) {
  async function createUser({ name, email, password }, role) {
    const user = { id: newUserId(), name, email, role, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() };
    // The email index is created first; create() fails if the email is already registered.
    if (!(await store.create(`email:${email}`, user.id))) {
      throw conflict("That email is already registered.", [{ field: "email", message: "That email is already registered." }], "EMAIL_TAKEN");
    }
    await store.create(`user:${user.id}`, user);
    return user;
  }

  return {
    /** Returns the user when the credentials are correct, otherwise throws 401 with a generic message. */
    async authenticate(email, password) {
      const id = await store.get(`email:${email}`);
      const user = id ? await store.get(`user:${id}`) : null;
      const ok = await verifyPassword(password, user ? user.passwordHash : DUMMY_HASH);
      if (!user || !ok) throw unauthorized("Email or password is incorrect.");
      return user;
    },

    async list() {
      const users = await store.list("user:");
      return users.map(publicUser).sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === "admin" ? -1 : 1));
    },

    async createStaff(body) {
      return publicUser(await createUser(validateStaffInput(body), "staff"));
    },

    async removeStaff(id, actingUserId) {
      if (!isSafeId(id)) throw notFound("That staff account does not exist.");
      const user = await store.get(`user:${id}`);
      if (!user) throw notFound("That staff account does not exist.");
      if (user.role === "admin") throw forbidden("Administrator accounts cannot be removed.");
      if (id === actingUserId) throw forbidden("You cannot remove your own account.");
      await store.delete(`user:${id}`);
      await store.delete(`email:${user.email}`);
    },

    /** Creates the first administrator from the environment settings when no admin exists. */
    async ensureAdmin(config) {
      const users = await store.list("user:");
      if (users.some((u) => u.role === "admin")) return null;
      if (!config.adminEmail || !config.adminPassword) {
        throw new Error("No administrator exists yet. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first one.");
      }
      const admin = await createUser(
        validateStaffInput({ name: config.adminName, email: config.adminEmail, password: config.adminPassword }),
        "admin"
      );
      console.log(`[auth] Created administrator account ${admin.email}`);
      return admin;
    },
  };
}

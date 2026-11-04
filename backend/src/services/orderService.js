import { conflict, notFound, validationError } from "../utils/errors.js";
import { createWithUniqueOrderId, isOrderId } from "../utils/ids.js";
import { STATUSES, validateOrderInput, validateStatus } from "../utils/validate.js";

export function createOrderService(store) {
  return {
    /** Prices and names always come from the menu stored on the server, never from the browser. */
    async create(body) {
      const { customerName, notes, items } = validateOrderInput(body);
      const lines = [];
      const unknown = [];
      const unavailable = [];

      for (const { id, quantity } of items) {
        const menuItem = /^[A-Za-z0-9_-]{1,80}$/.test(id) ? await store.get(`menu:${id}`) : null;
        if (!menuItem) unknown.push({ field: "items", message: `Menu item ${id} does not exist.` });
        else if (menuItem.available === false) unavailable.push({ field: "items", message: `${menuItem.name} is currently unavailable.` });
        else lines.push({ id: menuItem.id, name: menuItem.name, price: menuItem.price, quantity });
      }
      if (unknown.length) throw validationError(unknown, "Some items are not on the menu.");
      if (unavailable.length) throw conflict("Some items are no longer available. Please remove them and try again.", unavailable, "ITEMS_UNAVAILABLE");

      const totalCents = lines.reduce((sum, l) => sum + Math.round(l.price * 100) * l.quantity, 0);
      const now = new Date().toISOString();
      return createWithUniqueOrderId(store, (id) => ({
        id, customerName, notes, items: lines, total: totalCents / 100,
        status: "Pending", createdAt: now, updatedAt: now,
      }));
    },

    async list({ status } = {}) {
      if (status !== undefined && !STATUSES.includes(status)) {
        throw validationError([{ field: "status", message: `status must be one of: ${STATUSES.join(", ")}.` }]);
      }
      const orders = await store.list("order:");
      return orders.filter((o) => !status || o.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async get(id) {
      const order = isOrderId(id) ? await store.get(`order:${id}`) : null;
      if (!order) throw notFound("That order does not exist.");
      return order;
    },

    async updateStatus(id, body) {
      const status = validateStatus(body);
      if (!isOrderId(id)) throw notFound("That order does not exist.");
      const now = new Date().toISOString();
      const updated = await store.update(`order:${id}`, (cur) => {
        const next = { ...cur, status, updatedAt: now };
        if (status === "Collected") next.collectedAt = now;
        else delete next.collectedAt;
        return next;
      });
      if (!updated) throw notFound("That order does not exist.");
      return updated;
    },
  };
}

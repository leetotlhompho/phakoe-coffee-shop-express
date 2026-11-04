import { newMenuId, isSafeId } from "../utils/ids.js";
import { notFound } from "../utils/errors.js";
import { CATEGORIES, validateMenuItem } from "../utils/validate.js";

export function createMenuService(store) {
  const key = (id) => `menu:${id}`;

  return {
    async list() {
      const items = await store.list("menu:");
      const rank = (c) => (CATEGORIES.includes(c) ? CATEGORIES.indexOf(c) : CATEGORIES.length);
      return items.sort((a, b) => rank(a.category) - rank(b.category) || a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name));
    },

    async get(id) {
      const item = isSafeId(id) ? await store.get(key(id)) : null;
      if (!item) throw notFound("That menu item does not exist.");
      return item;
    },

    async create(body) {
      const data = validateMenuItem(body);
      const now = new Date().toISOString();
      const item = { id: newMenuId(), ...data, createdAt: now, updatedAt: now };
      await store.create(key(item.id), item);
      return item;
    },

    async update(id, body) {
      const changes = validateMenuItem(body, { partial: true });
      if (!isSafeId(id)) throw notFound("That menu item does not exist.");
      const updated = await store.update(key(id), (cur) => ({ ...cur, ...changes, id: cur.id, updatedAt: new Date().toISOString() }));
      if (!updated) throw notFound("That menu item does not exist.");
      return updated;
    },

    async remove(id) {
      if (!isSafeId(id) || !(await store.delete(key(id)))) throw notFound("That menu item does not exist.");
    },
  };
}

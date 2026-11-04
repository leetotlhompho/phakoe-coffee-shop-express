import { seedMenu } from "./seedData.js";
import { newMenuId } from "./utils/ids.js";

/** Loads the sample menu once. After that, staff own the menu (deleting everything will not bring the samples back). */
export async function seedMenuIfNeeded(store) {
  if (await store.get("meta:seeded")) return 0;
  const base = Date.now();
  for (const [i, item] of seedMenu.entries()) {
    const id = newMenuId();
    const stamp = new Date(base + i).toISOString(); // keeps the sample order
    await store.create(`menu:${id}`, { id, ...item, createdAt: stamp, updatedAt: stamp });
  }
  await store.set("meta:seeded", true);
  return seedMenu.length;
}

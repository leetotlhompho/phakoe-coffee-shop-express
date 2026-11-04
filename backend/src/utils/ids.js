import { randomInt, randomUUID } from "node:crypto";
import { conflict } from "./errors.js";

// No 0/O/1/I so order numbers are easy to read out and type.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomCode(length = 6) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export const newMenuId = () => `menu_${randomUUID()}`;
export const newUserId = () => `user_${randomUUID()}`;

/** Menu and user IDs only ever contain these characters; anything else cannot exist. */
export const isSafeId = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(id);
export const isOrderId = (id) => typeof id === "string" && /^BH-[A-Z0-9]{4,12}$/.test(id);

/**
 * Creates an order with a unique, human-friendly number such as BH-7K3M9Q.
 * store.create() only succeeds when the key is free, so two orders can never share a number.
 */
export async function createWithUniqueOrderId(store, buildRecord) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = `BH-${randomCode(6)}`;
    const record = buildRecord(id);
    if (await store.create(`order:${id}`, record)) return record;
  }
  throw conflict("Could not generate a unique order number. Please try again.", undefined, "ID_GENERATION_FAILED");
}

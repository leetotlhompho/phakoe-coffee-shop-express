import { createFileStore } from "./fileStore.js";
import { createRedisStore } from "./redisStore.js";

/**
 * Key layout (all values are JSON documents):
 *   menu:<menuId>        menu items
 *   order:<orderId>      customer orders
 *   user:<userId>        staff/admin accounts (password stored as a salted scrypt hash)
 *   email:<email>        email -> userId index (also guarantees unique emails)
 *   meta:seeded          set once the sample menu has been loaded
 */
export async function createStore(config) {
  return config.redisUrl ? createRedisStore(config.redisUrl) : createFileStore(config.dataFile);
}

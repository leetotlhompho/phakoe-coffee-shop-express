import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createFileStore } from "../src/db/fileStore.js";
import { seedMenuIfNeeded } from "../src/seed.js";
import { createUserService } from "../src/services/userService.js";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bh-api-"));
const dbFile = path.join(dir, "db.json");
const config = loadConfig({
  jwtSecret: "test-secret-test-secret-test-secret-123",
  adminEmail: "admin@test.local",
  adminPassword: "AdminPass1!",
  allowedOrigins: ["https://shop.example.com", "https://*.vercel.app"],
  loginLimit: { windowMs: 60_000, max: 5 },
});

let store, server, base;
async function boot() {
  store = await createFileStore(dbFile);
  await seedMenuIfNeeded(store);
  await createUserService(store).ensureAdmin(config);
  server = http.createServer(createApp({ store, config }));
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
}
async function shutdown() {
  await new Promise((r) => server.close(r));
  await store.close();
}

async function call(method, url, { body, token, headers = {}, raw } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { ...(body !== undefined || raw ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : null };
}
const login = async (email, password) => (await call("POST", "/api/auth/login", { body: { email, password } }));

before(boot);
after(shutdown);

let adminToken, staffToken, staffId, menuId, orderId;

test("GET /api/health reports the database is connected", async () => {
  const r = await call("GET", "/api/health");
  assert.equal(r.status, 200);
  assert.equal(r.json.status, "ok");
});

test("unknown API routes return a consistent JSON 404", async () => {
  const r = await call("GET", "/api/nope");
  assert.equal(r.status, 404);
  assert.equal(r.json.error.code, "NOT_FOUND");
});

test("menu is seeded and public", async () => {
  const r = await call("GET", "/api/menu");
  assert.equal(r.status, 200);
  assert.ok(r.json.length >= 10);
  assert.ok(r.json[0].id.startsWith("menu_"));
  menuId = r.json[0].id;
  const one = await call("GET", `/api/menu/${menuId}`);
  assert.equal(one.status, 200);
  assert.equal((await call("GET", "/api/menu/does-not-exist")).status, 404);
});

test("staff-only endpoints reject anonymous visitors with 401", async () => {
  assert.equal((await call("POST", "/api/menu", { body: { name: "x" } })).status, 401);
  assert.equal((await call("PUT", `/api/menu/${menuId}`, { body: { price: 5 } })).status, 401);
  assert.equal((await call("DELETE", `/api/menu/${menuId}`)).status, 401);
  assert.equal((await call("GET", "/api/orders")).status, 401);
  assert.equal((await call("PATCH", "/api/orders/BH-AAAAAA/status", { body: { status: "Ready" } })).status, 401);
  assert.equal((await call("GET", "/api/staff")).status, 401);
  assert.equal((await call("GET", "/api/orders", { token: "garbage.token.here" })).status, 401);
});

test("login: wrong password is rejected, correct one returns a token", async () => {
  assert.equal((await login("admin@test.local", "wrong")).status, 401);
  assert.equal((await login("nobody@test.local", "whatever1")).status, 401);
  assert.equal((await call("POST", "/api/auth/login", { body: { email: "x" } })).status, 400);
  const r = await login("Admin@Test.local", "AdminPass1!");
  assert.equal(r.status, 200);
  assert.equal(r.json.user.role, "admin");
  assert.equal(r.json.user.passwordHash, undefined);
  adminToken = r.json.token;
  assert.equal((await call("GET", "/api/auth/me", { token: adminToken })).json.email, "admin@test.local");
});

test("admin creates staff; duplicate and invalid input are rejected", async () => {
  const bad = await call("POST", "/api/staff", { token: adminToken, body: { name: "", email: "nope", password: "123" } });
  assert.equal(bad.status, 400);
  assert.equal(bad.json.error.code, "VALIDATION_ERROR");
  assert.ok(bad.json.error.details.length >= 3);

  const ok = await call("POST", "/api/staff", { token: adminToken, body: { name: "Lerato", email: "lerato@test.local", password: "StaffPass1" } });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.role, "staff");
  assert.equal(ok.json.passwordHash, undefined);
  staffId = ok.json.id;

  const dup = await call("POST", "/api/staff", { token: adminToken, body: { name: "L2", email: "LERATO@test.local", password: "StaffPass1" } });
  assert.equal(dup.status, 409);
  assert.equal(dup.json.error.code, "EMAIL_TAKEN");

  const list = await call("GET", "/api/staff", { token: adminToken });
  assert.equal(list.json.length, 2);
  assert.ok(list.json.every((u) => u.passwordHash === undefined));

  staffToken = (await login("lerato@test.local", "StaffPass1")).json.token;
  assert.ok(staffToken);
});

test("staff cannot manage staff accounts (403) but can use staff endpoints", async () => {
  assert.equal((await call("GET", "/api/staff", { token: staffToken })).status, 403);
  assert.equal((await call("POST", "/api/staff", { token: staffToken, body: { name: "x", email: "x@y.zz", password: "12345678" } })).status, 403);
  assert.equal((await call("DELETE", `/api/staff/${staffId}`, { token: staffToken })).status, 403);
  assert.equal((await call("GET", "/api/orders", { token: staffToken })).status, 200);
});

test("menu validation returns 400 with field details", async () => {
  const bad = await call("POST", "/api/menu", { token: staffToken, body: { name: "", category: "Soup", price: -3, image: "javascript:alert(1)", available: "yes" } });
  assert.equal(bad.status, 400);
  const fields = bad.json.error.details.map((d) => d.field);
  for (const f of ["name", "description", "category", "price", "image", "available"]) assert.ok(fields.includes(f), `missing ${f}`);
  assert.equal((await call("POST", "/api/menu", { token: staffToken, raw: "{not json" })).json.error.code, "INVALID_JSON");
  assert.equal((await call("POST", "/api/menu", { token: staffToken, body: [1, 2] })).status, 400);
  assert.equal((await call("POST", "/api/menu", { token: staffToken, body: { name: "A", description: "B", category: "Tea", price: 1.234 } })).status, 400);
  assert.equal((await call("POST", "/api/menu", { token: staffToken, raw: JSON.stringify({ description: "x".repeat(1_200_000) }) })).status, 413);
});

test("menu items accept a photo from the device (data URL) and reject other junk", async () => {
  const tiny = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD";
  const ok = await call("POST", "/api/menu", { token: staffToken, body: { name: "Photo Latte", description: "d", category: "Coffee", price: 5, image: tiny } });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.image, tiny);
  const local = await call("POST", "/api/menu", { token: staffToken, body: { name: "Water", description: "d", category: "Other", price: 12, image: "images/water.jpg" } });
  assert.equal(local.status, 201);
  assert.equal(local.json.image, "images/water.jpg");
  const trav = await call("POST", "/api/menu", { token: staffToken, body: { name: "Bad2", description: "d", category: "Other", price: 12, image: "images/../secret.jpg" } });
  assert.equal(trav.status, 400);
  const svg = await call("POST", "/api/menu", { token: staffToken, body: { name: "Bad", description: "d", category: "Coffee", price: 5, image: "data:image/svg+xml;base64,PHN2Zz4=" } });
  assert.equal(svg.status, 400);
  const big = await call("POST", "/api/menu", { token: staffToken, body: { name: "Big", description: "d", category: "Coffee", price: 5, image: "data:image/jpeg;base64," + "A".repeat(800_000) } });
  assert.equal(big.status, 400);
});

test("staff can add, update (incl. availability) and delete menu items; photo stays empty when not given", async () => {
  const created = await call("POST", "/api/menu", { token: staffToken, body: { name: "  Rooibos   Tea ", description: "Caffeine-free", category: "Tea", price: 18.5 } });
  assert.equal(created.status, 201);
  assert.equal(created.json.name, "Rooibos Tea");
  assert.equal(created.json.image, "");
  assert.equal(created.json.available, true);
  assert.ok(created.headers.get("location").endsWith(created.json.id));
  const id = created.json.id;

  const upd = await call("PUT", `/api/menu/${id}`, { token: staffToken, body: { price: 20, available: false, name: "Rooibos" } });
  assert.equal(upd.status, 200);
  assert.equal(upd.json.price, 20);
  assert.equal(upd.json.available, false);
  assert.equal(upd.json.category, "Tea");
  assert.equal((await call("PUT", `/api/menu/${id}`, { token: staffToken, body: {} })).status, 400);
  assert.equal((await call("PUT", "/api/menu/menu_missing", { token: staffToken, body: { price: 2 } })).status, 404);

  assert.equal((await call("DELETE", `/api/menu/${id}`, { token: staffToken })).status, 204);
  assert.equal((await call("GET", `/api/menu/${id}`)).status, 404);
  assert.equal((await call("DELETE", `/api/menu/${id}`, { token: staffToken })).status, 404);
});

test("placing an order: server prices it, rejects bad/unavailable items, generates a unique number", async () => {
  const menu = (await call("GET", "/api/menu")).json;
  const a = menu[0], b = menu[1];
  const bad = await call("POST", "/api/orders", { body: { customerName: "", items: [{ id: a.id, quantity: 0 }] } });
  assert.equal(bad.status, 400);
  assert.equal((await call("POST", "/api/orders", { body: { customerName: "Thabo", items: [{ id: "menu_nope", quantity: 1 }] } })).status, 400);
  assert.equal((await call("POST", "/api/orders", { body: { customerName: "Thabo", items: [] } })).status, 400);

  const r = await call("POST", "/api/orders", { body: { customerName: "  Thabo  Mokoena ", notes: "oat milk", total: 1, items: [{ id: a.id, quantity: 2, price: 0.01 }, { id: b.id, quantity: 1 }, { id: a.id, quantity: 1 }] } });
  assert.equal(r.status, 201);
  assert.match(r.json.id, /^BH-[A-Z2-9]{6}$/);
  assert.equal(r.json.status, "Pending");
  assert.equal(r.json.customerName, "Thabo Mokoena");
  assert.equal(r.json.items.length, 2);
  assert.equal(r.json.items.find((i) => i.id === a.id).quantity, 3);
  assert.equal(r.json.total, Math.round((a.price * 3 + b.price) * 100) / 100);
  orderId = r.json.id;

  const ids = new Set();
  for (let i = 0; i < 15; i++) ids.add((await call("POST", "/api/orders", { body: { customerName: "Bulk", items: [{ id: a.id, quantity: 1 }] } })).json.id);
  assert.equal(ids.size, 15);

  await call("PUT", `/api/menu/${b.id}`, { token: staffToken, body: { available: false } });
  const un = await call("POST", "/api/orders", { body: { customerName: "Thabo", items: [{ id: b.id, quantity: 1 }] } });
  assert.equal(un.status, 409);
  assert.equal(un.json.error.code, "ITEMS_UNAVAILABLE");
  await call("PUT", `/api/menu/${b.id}`, { token: staffToken, body: { available: true } });
});

test("customers need order number + name; staff can view any order", async () => {
  assert.equal((await call("GET", `/api/orders/${orderId}`)).status, 401);
  assert.equal((await call("GET", `/api/orders/${orderId}?customerName=Someone`)).status, 404);
  const ok = await call("GET", `/api/orders/${orderId}?customerName=thabo%20MOKOENA`);
  assert.equal(ok.status, 200);
  assert.equal(ok.json.id, orderId);
  assert.equal((await call("GET", `/api/orders/${orderId}`, { token: staffToken })).status, 200);
  assert.equal((await call("GET", "/api/orders/BH-ZZZZZZ?customerName=x")).status, 404);
  assert.equal((await call("GET", "/api/orders/not-an-id?customerName=x")).status, 404);
});

test("staff list orders and update status; invalid status is rejected", async () => {
  const list = await call("GET", "/api/orders", { token: staffToken });
  assert.equal(list.status, 200);
  assert.ok(list.json.length >= 16);
  assert.equal((await call("GET", "/api/orders?status=Nope", { token: staffToken })).status, 400);
  assert.equal((await call("PATCH", `/api/orders/${orderId}/status`, { token: staffToken, body: { status: "Done" } })).status, 400);
  assert.equal((await call("PATCH", "/api/orders/BH-ZZZZZZ/status", { token: staffToken, body: { status: "Ready" } })).status, 404);

  for (const s of ["Preparing", "Ready", "Collected"]) {
    const r = await call("PATCH", `/api/orders/${orderId}/status`, { token: staffToken, body: { status: s } });
    assert.equal(r.status, 200);
    assert.equal(r.json.status, s);
    const seenByCustomer = await call("GET", `/api/orders/${orderId}?customerName=Thabo Mokoena`);
    assert.equal(seenByCustomer.json.status, s);
  }
  const done = (await call("GET", `/api/orders/${orderId}`, { token: staffToken })).json;
  assert.ok(done.collectedAt);
  const onlyCollected = await call("GET", "/api/orders?status=Collected", { token: staffToken });
  assert.deepEqual(onlyCollected.json.map((o) => o.id), [orderId]);
});

test("CORS: allowed sites get headers, others do not; preflight returns 204", async () => {
  const ok = await call("GET", "/api/menu", { headers: { Origin: "https://shop.example.com" } });
  assert.equal(ok.headers.get("access-control-allow-origin"), "https://shop.example.com");
  const wild = await call("GET", "/api/menu", { headers: { Origin: "https://brewhaven-git-main.vercel.app" } });
  assert.equal(wild.headers.get("access-control-allow-origin"), "https://brewhaven-git-main.vercel.app");
  const no = await call("GET", "/api/menu", { headers: { Origin: "https://evil.example" } });
  assert.equal(no.headers.get("access-control-allow-origin"), null);
  const pre = await call("OPTIONS", "/api/menu", { headers: { Origin: "https://shop.example.com" } });
  assert.equal(pre.status, 204);
});

test("admin removes staff; the removed account's token stops working immediately", async () => {
  assert.equal((await call("DELETE", `/api/staff/${staffId}`, { token: adminToken })).status, 204);
  assert.equal((await call("GET", "/api/orders", { token: staffToken })).status, 401);
  assert.equal((await login("lerato@test.local", "StaffPass1")).status, 401);
  assert.equal((await call("DELETE", `/api/staff/${staffId}`, { token: adminToken })).status, 404);
  const adminId = (await call("GET", "/api/auth/me", { token: adminToken })).json.id;
  assert.equal((await call("DELETE", `/api/staff/${adminId}`, { token: adminToken })).status, 403);
  // the email can be registered again after removal
  assert.equal((await call("POST", "/api/staff", { token: adminToken, body: { name: "Lerato", email: "lerato@test.local", password: "StaffPass2" } })).status, 201);
});

test("repeated failed logins are rate limited (429)", async () => {
  let last;
  for (let i = 0; i < 7; i++) last = await call("POST", "/api/auth/login", { body: { email: "admin@test.local", password: "bad-password" }, headers: { "x-test-ip": "9.9.9.9" } });
  assert.equal(last.status, 429);
  assert.ok(last.headers.get("retry-after"));
});

test("everything persists after the server restarts", async () => {
  const before = { menu: (await call("GET", "/api/menu")).json.length, orders: (await call("GET", "/api/orders", { token: adminToken })).json.length };
  await shutdown();
  await boot(); // brand-new store + server reading the same file
  const menu = await call("GET", "/api/menu");
  const orders = await call("GET", "/api/orders", { token: adminToken }); // old token still valid: user + secret persisted
  assert.equal(menu.json.length, before.menu);
  assert.equal(orders.json.length, before.orders);
  assert.equal((await call("GET", `/api/orders/${orderId}?customerName=Thabo Mokoena`)).json.status, "Collected");
  assert.equal((await login("admin@test.local", "AdminPass1!")).status, 200);
  // seeding must not run twice
  assert.equal((await call("GET", "/api/menu")).json.length, before.menu);
});

test("signed-in people can change their own password", async () => {
  const login2 = async (email, password) => call("POST", "/api/auth/login", { body: { email, password } });
  const fresh = (await login2("admin@test.local", "AdminPass1!")).json?.token ?? adminToken;
  // wrong current password is a normal error, not a sign-out
  const wrong = await call("POST", "/api/auth/change-password", { token: fresh, body: { currentPassword: "nope", newPassword: "NewPass123" } });
  assert.equal(wrong.status, 400);
  // too short / same as current
  assert.equal((await call("POST", "/api/auth/change-password", { token: fresh, body: { currentPassword: "AdminPass1!", newPassword: "short" } })).status, 400);
  assert.equal((await call("POST", "/api/auth/change-password", { token: fresh, body: { currentPassword: "AdminPass1!", newPassword: "AdminPass1!" } })).status, 400);
  // not signed in
  assert.equal((await call("POST", "/api/auth/change-password", { body: { currentPassword: "AdminPass1!", newPassword: "NewPass123" } })).status, 401);
  // works, returns a new token, old password and old token stop working
  const ok = await call("POST", "/api/auth/change-password", { token: fresh, body: { currentPassword: "AdminPass1!", newPassword: "NewPass123" } });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.token);
  assert.equal(ok.json.user.mustChangePassword, false);
  assert.equal((await login2("admin@test.local", "AdminPass1!")).status, 401);
  assert.equal((await login2("admin@test.local", "NewPass123")).status, 200);
  assert.equal((await call("GET", "/api/auth/me", { token: ok.json.token })).status, 200);
});

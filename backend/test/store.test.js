import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createFileStore } from "../src/db/fileStore.js";

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bh-store-")), "db.json");

test("data persists after the store is closed and re-opened (server restart)", async () => {
  const file = tmpFile();
  const a = await createFileStore(file);
  await a.set("menu:1", { name: "Latte" });
  await a.close();
  const b = await createFileStore(file);
  assert.deepEqual(await b.get("menu:1"), { name: "Latte" });
});

test("create() refuses to overwrite, update() changes in place, delete() removes", async () => {
  const s = await createFileStore(tmpFile());
  assert.equal(await s.create("k", { n: 1 }), true);
  assert.equal(await s.create("k", { n: 2 }), false);
  assert.deepEqual(await s.update("k", (v) => ({ ...v, n: v.n + 10 })), { n: 11 });
  assert.equal(await s.update("missing", (v) => v), null);
  assert.equal(await s.delete("k"), true);
  assert.equal(await s.delete("k"), false);
});

test("list() returns only records with the prefix and returns copies", async () => {
  const s = await createFileStore(tmpFile());
  await s.set("menu:a", { v: 1 });
  await s.set("order:a", { v: 2 });
  const menu = await s.list("menu:");
  assert.equal(menu.length, 1);
  menu[0].v = 99;
  assert.equal((await s.get("menu:a")).v, 1);
});

test("a corrupt database file is backed up instead of crashing", async () => {
  const file = tmpFile();
  fs.writeFileSync(file, "{ not json");
  const s = await createFileStore(file);
  assert.equal(await s.get("anything"), null);
  assert.ok(fs.readdirSync(path.dirname(file)).some((f) => f.includes("corrupt")));
});

test("many simultaneous writes all end up saved", async () => {
  const file = tmpFile();
  const s = await createFileStore(file);
  await Promise.all(Array.from({ length: 50 }, (_, i) => s.set(`k:${i}`, { i })));
  await s.close();
  const again = await createFileStore(file);
  assert.equal((await again.list("k:")).length, 50);
});

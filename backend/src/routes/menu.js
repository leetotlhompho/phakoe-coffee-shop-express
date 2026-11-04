import express from "express";
import { wrap } from "../middleware/common.js";
import { createMenuService } from "../services/menuService.js";

export function menuRoutes({ store }, auth) {
  const r = express.Router();
  const menu = createMenuService(store);

  // Public: customers browse the menu.
  r.get("/", wrap(async (req, res) => res.json(await menu.list())));
  r.get("/:id", wrap(async (req, res) => res.json(await menu.get(req.params.id))));

  // Staff and administrators only.
  r.post("/", auth.staff, wrap(async (req, res) => {
    const item = await menu.create(req.body);
    res.set("Location", `/api/menu/${item.id}`).status(201).json(item);
  }));
  r.put("/:id", auth.staff, wrap(async (req, res) => res.json(await menu.update(req.params.id, req.body))));
  r.delete("/:id", auth.staff, wrap(async (req, res) => {
    await menu.remove(req.params.id);
    res.status(204).end();
  }));
  return r;
}

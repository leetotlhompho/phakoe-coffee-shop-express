import express from "express";
import { wrap } from "../middleware/common.js";
import { createUserService } from "../services/userService.js";

/** Administrator only: manage staff accounts. */
export function staffRoutes({ store }, auth) {
  const r = express.Router();
  const users = createUserService(store);

  r.get("/", auth.admin, wrap(async (req, res) => res.json(await users.list())));
  r.post("/", auth.admin, wrap(async (req, res) => {
    const staff = await users.createStaff(req.body);
    res.set("Location", `/api/staff/${staff.id}`).status(201).json(staff);
  }));
  r.delete("/:id", auth.admin, wrap(async (req, res) => {
    await users.removeStaff(req.params.id, req.user.id);
    res.status(204).end();
  }));
  return r;
}

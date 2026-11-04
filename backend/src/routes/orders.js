import express from "express";
import { limitRequests, wrap } from "../middleware/common.js";
import { createOrderService } from "../services/orderService.js";
import { notFound, unauthorized } from "../utils/errors.js";
import { createLimiter } from "../utils/rateLimit.js";

export function ordersRoutes({ store, config }, auth) {
  const r = express.Router();
  const orders = createOrderService(store);
  const orderLimiter = createLimiter(config.orderLimit);

  // Staff: all orders (optionally ?status=Pending).
  r.get("/", auth.staff, wrap(async (req, res) => res.json(await orders.list({ status: req.query.status }))));

  // Public: a customer places an order.
  r.post("/", limitRequests(orderLimiter, "Too many orders from this connection. Please wait a few minutes."), wrap(async (req, res) => {
    const order = await orders.create(req.body);
    res.set("Location", `/api/orders/${order.id}`).status(201).json(order);
  }));

  // Staff can read any order. A customer must give the order number AND the name used on the order.
  r.get("/:id", auth.optional, wrap(async (req, res) => {
    const order = await orders.get(req.params.id);
    if (req.user) return res.json(order);
    const name = req.query.customerName;
    if (typeof name !== "string" || !name.trim()) {
      throw unauthorized("Provide the name used on the order (customerName), or sign in as staff.");
    }
    if (order.customerName.trim().toLowerCase() !== name.replace(/\s+/g, " ").trim().toLowerCase()) {
      throw notFound("That order does not exist.");
    }
    res.json(order);
  }));

  // Staff: Pending -> Preparing -> Ready -> Collected
  r.patch("/:id/status", auth.staff, wrap(async (req, res) => res.json(await orders.updateStatus(req.params.id, req.body))));
  return r;
}

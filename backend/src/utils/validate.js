import { validationError } from "./errors.js";

export const CATEGORIES = ["Coffee", "Tea", "Cold Drinks", "Pastries", "Food", "Other"];
export const MAX_IMAGE_CHARS = 700_000; // ~500 KB photo
export const LOCAL_IMAGE_RE = /^\/?images\/[\w\-. ()]+\.(jpe?g|png|webp|gif|avif)$/i;
export const STATUSES = ["Pending", "Preparing", "Ready", "Collected"];

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const clean = (s) => s.replace(/\s+/g, " ").trim();
const hasControlChars = (s) => /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(s);

function ensureBody(body) {
  if (!isObject(body)) throw validationError([{ field: "body", message: "Send a JSON object in the request body." }]);
  return body;
}

class Check {
  errors = [];
  add(field, message) { this.errors.push({ field, message }); }
  done() { if (this.errors.length) throw validationError(this.errors); }
}

function text(check, body, field, { min = 0, max, required = true, multiline = false }) {
  const v = body[field];
  if (v === undefined || v === null) {
    if (required) check.add(field, `${field} is required.`);
    return undefined;
  }
  if (typeof v !== "string") { check.add(field, `${field} must be text.`); return undefined; }
  if (hasControlChars(v)) { check.add(field, `${field} contains invalid characters.`); return undefined; }
  const value = multiline ? v.trim() : clean(v);
  if (value.length < min) { check.add(field, min === 1 ? `${field} cannot be empty.` : `${field} must be at least ${min} characters.`); return undefined; }
  if (value.length > max) { check.add(field, `${field} must be at most ${max} characters.`); return undefined; }
  return value;
}

/** Validates a menu item. With partial=true only the fields that were sent are checked (used by PUT). */
export function validateMenuItem(body, { partial = false } = {}) {
  ensureBody(body);
  const check = new Check();
  const out = {};
  const req = !partial;
  const has = (f) => body[f] !== undefined;

  if (!partial || has("name")) out.name = text(check, body, "name", { min: 1, max: 80, required: req });
  if (!partial || has("description")) out.description = text(check, body, "description", { min: 1, max: 300, required: req, multiline: true });

  if (!partial || has("category")) {
    if (!CATEGORIES.includes(body.category)) check.add("category", `category must be one of: ${CATEGORIES.join(", ")}.`);
    else out.category = body.category;
  }

  if (!partial || has("price")) {
    const p = body.price;
    if (typeof p !== "number" || !Number.isFinite(p)) check.add("price", "price must be a number.");
    else if (p <= 0 || p > 10000) check.add("price", "price must be greater than 0 and at most 10000.");
    else if (Math.abs(p * 100 - Math.round(p * 100)) > 1e-6) check.add("price", "price can have at most 2 decimal places.");
    else out.price = Math.round(p * 100) / 100;
  }

  if (has("image") || (!partial && body.image !== undefined)) {
    const img = body.image;
    if (img === null || img === "") out.image = "";
    else if (typeof img !== "string") check.add("image", "image must be a photo uploaded from your device, or empty.");
    else if (img.startsWith("data:")) {
      // Photo chosen from the device, sent as a small JPEG/PNG/WEBP data URL.
      if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(img)) check.add("image", "image must be a JPG, PNG or WEBP photo.");
      else if (img.length > MAX_IMAGE_CHARS) check.add("image", "That photo is too large after processing. Please choose a smaller one.");
      else out.image = img;
    } else if (LOCAL_IMAGE_RE.test(img.trim()) && !img.includes("..")) {
      // A photo kept in the project's images folder, e.g. "images/water.jpg".
      out.image = img.trim().replace(/^\/+/, "");
    } else {
      // Photos already saved earlier as web addresses keep working; new ones come from the device.
      if (img.length > 500) check.add("image", "image must be a photo uploaded from your device, or empty.");
      else {
        try {
          const u = new URL(img.trim());
          if (!["http:", "https:"].includes(u.protocol)) throw new Error();
          out.image = u.toString();
        } catch { check.add("image", "image must be a photo uploaded from your device, or empty."); }
      }
    }
  } else if (!partial) out.image = "";

  if (has("available")) {
    if (typeof body.available !== "boolean") check.add("available", "available must be true or false.");
    else out.available = body.available;
  } else if (!partial) out.available = true;

  if (has("badge")) {
    const b = text(check, body, "badge", { max: 24, required: false });
    if (b !== undefined) out.badge = b;
  } else if (!partial) out.badge = "";

  check.done();
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
  if (partial && Object.keys(out).length === 0) {
    throw validationError([{ field: "body", message: "Send at least one field to update." }]);
  }
  return out;
}

export function validateOrderInput(body) {
  ensureBody(body);
  const check = new Check();
  const customerName = text(check, body, "customerName", { min: 1, max: 60 });
  const notes = text(check, body, "notes", { max: 300, required: false, multiline: true }) ?? "";
  const merged = new Map();

  if (!Array.isArray(body.items) || body.items.length === 0) check.add("items", "items must be a non-empty list.");
  else if (body.items.length > 50) check.add("items", "An order can contain at most 50 different items.");
  else {
    body.items.forEach((it, i) => {
      if (!isObject(it) || typeof it.id !== "string" || it.id.length === 0 || it.id.length > 100) {
        check.add(`items[${i}].id`, "Each item needs an id.");
      } else if (!Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 99) {
        check.add(`items[${i}].quantity`, "quantity must be a whole number from 1 to 99.");
      } else merged.set(it.id, Math.min(99, (merged.get(it.id) || 0) + it.quantity));
    });
  }
  check.done();
  return { customerName, notes, items: [...merged].map(([id, quantity]) => ({ id, quantity })) };
}

export function validateStatus(body) {
  ensureBody(body);
  if (!STATUSES.includes(body.status)) {
    throw validationError([{ field: "status", message: `status must be one of: ${STATUSES.join(", ")}.` }]);
  }
  return body.status;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateLogin(body) {
  ensureBody(body);
  const check = new Check();
  if (typeof body.email !== "string" || !body.email.trim()) check.add("email", "email is required.");
  if (typeof body.password !== "string" || !body.password) check.add("password", "password is required.");
  check.done();
  return { email: body.email.trim().toLowerCase().slice(0, 120), password: body.password.slice(0, 200) };
}

export function validateStaffInput(body) {
  ensureBody(body);
  const check = new Check();
  const name = text(check, body, "name", { min: 1, max: 60 });
  let email;
  if (typeof body.email !== "string") check.add("email", "email is required.");
  else {
    email = body.email.trim().toLowerCase();
    if (email.length > 120 || !EMAIL_RE.test(email)) { check.add("email", "email must be a valid email address."); email = undefined; }
  }
  const pw = body.password;
  if (typeof pw !== "string") check.add("password", "password is required.");
  else if (pw.length < 8 || pw.length > 100) check.add("password", "password must be 8 to 100 characters.");
  check.done();
  return { name, email, password: pw };
}

/** Body of POST /api/auth/change-password */
export function validateChangePassword(body) {
  ensureBody(body);
  const check = new Check();
  const { currentPassword, newPassword } = body;
  if (typeof currentPassword !== "string" || !currentPassword) check.add("currentPassword", "Enter your current password.");
  if (typeof newPassword !== "string") check.add("newPassword", "Enter a new password.");
  else if (newPassword.length < 8 || newPassword.length > 100) check.add("newPassword", "The new password must be 8 to 100 characters.");
  check.done();
  return { currentPassword: currentPassword.slice(0, 200), newPassword };
}

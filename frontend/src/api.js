// Talks to the Phakoe's Coffee Shop Express API. Set VITE_API_URL to your Render URL when you deploy.
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

// The sign-in token is kept in memory only (never saved in the browser), so reloading the page
// or leaving the staff area always means signing in again.
let token = null;

export const getToken = () => token;
export function setToken(value) {
  token = value;
}

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Turns an error into one readable sentence, including field problems from the API. */
export function describeError(err) {
  if (!err) return "Something went wrong.";
  const fields = Array.isArray(err.details) ? err.details.map((d) => d.message).filter(Boolean) : [];
  return fields.length ? `${err.message} ${fields.join(" ")}` : err.message || "Something went wrong.";
}

export const hooks = { onUnauthorized: null };

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Cannot reach the server. Check your internet connection and try again.");
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith("/api/auth/login")) hooks.onUnauthorized?.();
    throw new ApiError(res.status, data?.error?.code, data?.error?.message || `Request failed (${res.status}).`, data?.error?.details);
  }
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body ?? {}),
  put: (path, body) => request("PUT", path, body ?? {}),
  patch: (path, body) => request("PATCH", path, body ?? {}),
  del: (path) => request("DELETE", path),
};

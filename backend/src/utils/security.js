import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

// ---------- passwords: salted scrypt (built into Node, no extra package) ----------
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, saltB64, hashB64] = String(stored).split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

// A real hash to compare against when the email is unknown, so response time does not reveal which emails exist.
export const DUMMY_HASH = await hashPassword(randomBytes(12).toString("hex"));

// ---------- signed bearer tokens (JWT, HS256) ----------
const b64url = (buf) => Buffer.from(buf).toString("base64url");
const sign = (data, secret) => createHmac("sha256", secret).update(data).digest();

export function signToken(payload, secret, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const data = `${head}.${b64url(JSON.stringify(body))}`;
  return { token: `${data}.${b64url(sign(data, secret))}`, expiresAt: new Date(body.exp * 1000).toISOString() };
}

/** Returns the payload if the token is genuine and not expired, otherwise null. */
export function verifyToken(token, secret) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    if (header.alg !== "HS256") return null;
    const given = Buffer.from(parts[2], "base64url");
    const expected = sign(`${parts[0]}.${parts[1]}`, secret);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

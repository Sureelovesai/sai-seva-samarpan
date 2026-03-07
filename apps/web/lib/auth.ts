import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SALT_LEN = 16;
const KEY_LEN = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN);
  const key = scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `${salt.toString("base64")}:${key.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltB64, keyB64] = stored.split(":");
  if (!saltB64 || !keyB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const key = Buffer.from(keyB64, "base64");
  const derived = scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return timingSafeEqual(key, derived);
}

// Set JWT_SECRET in .env for production (e.g. a long random string)
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const COOKIE_NAME = "seva_session";

export function signToken(payload: { sub: string; email: string }): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + 60 * 60 * 24 * 7 };
  const b64 = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${b64(header)}.${b64(body)}`;
  const sig = createHmac("sha256", JWT_SECRET).update(unsigned).digest("base64url");
  return `${unsigned}.${sig}`;
}

export function verifyToken(token: string): { sub: string; email: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const unsigned = `${header}.${body}`;
    const expected = createHmac("sha256", JWT_SECRET).update(unsigned).digest("base64url");
    if (sig !== expected) return null;
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString());
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: decoded.sub, email: decoded.email };
  } catch {
    return null;
  }
}

export function getCookieName(): string {
  return COOKIE_NAME;
}

export function getSessionFromCookie(cookieHeader: string | null): { sub: string; email: string } | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = match?.[1]?.trim();
  if (!token) return null;
  return verifyToken(token);
}

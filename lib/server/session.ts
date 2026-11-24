import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Role } from "@/lib/data/businesses";
import { isDemoPhone } from "@/lib/stock";

const SECRET = process.env.SESSION_SECRET || "dev-only-insecure-secret";
export const USER_COOKIE = "nam_session";
export const ADMIN_COOKIE = "nam_admin";

export interface UserSession {
  /** Contact number — also the key that listings, leads and orders are stored under. */
  phone: string;
  name: string;
  role: Role;
  businessId?: string;
  /** Set for real (email) accounts; absent on demo sessions. */
  email?: string;
  uid?: string;
  exp: number;
}
export interface AdminSession {
  email: string;
  uid: string;
  exp: number;
}

function sign(payload: object) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verify<T extends { exp: number }>(token: string | undefined): T | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", SECRET).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

const base = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

/**
 * The signed-in marketplace user. Only two kinds of session are valid: real accounts (email sign-in, carry `uid`)
 * and demo accounts. Cookies from the old phone-only sign-in were never verified, so they're ignored.
 */
export async function getUserSession() {
  const s = verify<UserSession>((await cookies()).get(USER_COOKIE)?.value);
  return s && (s.uid || isDemoPhone(s.phone)) ? s : null;
}
export async function setUserSession(s: Omit<UserSession, "exp">) {
  const days = 30;
  (await cookies()).set(USER_COOKIE, sign({ ...s, exp: Date.now() + days * 864e5 }), { ...base, maxAge: days * 86400 });
}
export async function clearUserSession() {
  (await cookies()).delete(USER_COOKIE);
}

export async function getAdminSession() {
  return verify<AdminSession>((await cookies()).get(ADMIN_COOKIE)?.value);
}
export async function setAdminSession(s: Omit<AdminSession, "exp">) {
  const hours = 12;
  (await cookies()).set(ADMIN_COOKIE, sign({ ...s, exp: Date.now() + hours * 36e5 }), { ...base, maxAge: hours * 3600, sameSite: "strict" });
}
export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

"use client";

/**
 * Keeps the client marketplace store (lib/db.ts) in sync with Supabase via /api/*.
 *
 * - Writes are optimistic: the local store updates instantly, then `push()` sends the change.
 * - `pull()` fetches a snapshot scoped to the signed-in user and replaces the local cache.
 * - If the server isn't configured (or the migration hasn't run), everything keeps working
 *   in local mode with demo data — `remote` stays false and nothing is sent.
 */

import { useDB, type Snapshot } from "./db";
import { toast, useApp, type User } from "./store";

let pending = 0;
let pulling: Promise<void> | null = null;
let started = false;

export async function push(op: string, payload: unknown) {
  if (!useDB.getState().remote) return;
  pending++;
  try {
    const res = await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op, payload }) });
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401 || res.status === 403) await handleBlocked(error);
      // 423: an engine is paused (Admin → Engines). 503 + MAINTENANCE: the site is in maintenance.
      else if (res.status === 423 || res.status === 503) toast({ title: "Not available right now", body: error ?? "Please try again later.", tone: "error" });
      else toast({ title: "Couldn't save that change", body: error ?? "Please try again.", tone: "error" });
      pending--;
      return pull(true);
    }
  } catch {
    toast({ title: "You're offline", body: "We'll refresh when you're back.", tone: "error" });
  }
  pending--;
}

export function pull(force = false): Promise<void> {
  if (pulling) return pulling;
  // Don't overwrite optimistic writes that are still in flight.
  if (pending > 0 && !force) return Promise.resolve();
  pulling = (async () => {
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      if (!res.ok) return; // 503 = not configured / tables missing → stay in local mode
      const snap = (await res.json()) as Snapshot;
      if (snap.me?.status === "suspended") return void (await handleBlocked("Your account has been suspended."));
      if (snap.me?.status === "demo_off") {
        useDB.getState().applySnapshot(snap);
        const live = snap.settings?.dataMode === "live";
        return void (await handleBlocked(live ? "Demo accounts are switched off — the marketplace is now on live data. Sign in with your own account." : "Demo accounts are switched off. Sign in with your own account."));
      }
      useDB.getState().applySnapshot(snap);
    } catch {
      /* offline: keep cache */
    } finally {
      pulling = null;
    }
  })();
  return pulling;
}

async function handleBlocked(reason?: string) {
  if (!useApp.getState().user) return;
  useApp.getState().signOut();
  await fetch("/api/auth", { method: "DELETE" }).catch(() => {});
  toast({ title: "Signed out", body: reason ?? "Your session is no longer valid.", tone: "error" });
}

/* ------------------------------- accounts ------------------------------- */

export type AuthResult =
  | { ok: true; user?: User; verify?: boolean; email?: string; local?: boolean }
  | { ok: false; error: string; code?: string };

/** POST /api/auth — sign up, sign in, password reset and email links. The server sets the session cookie. */
export async function authApi(action: string, body: Record<string, unknown> = {}): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...body }) });
    const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (j.mode === "local") return { ok: true, local: true };
    if (!res.ok) return { ok: false, error: String(j.error ?? "Something went wrong. Please try again."), code: j.code as string | undefined };
    return { ok: true, ...(j as object) } as AuthResult;
  } catch {
    return { ok: false, error: "You're offline. Check your connection and try again." };
  }
}

/** Demo accounts (stock data only). */
export async function startDemo(phone: string): Promise<AuthResult> {
  try {
    const res = await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone }) });
    const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (j.mode === "local") return { ok: true, local: true };
    if (!res.ok) return { ok: false, error: String(j.error ?? "Couldn't open the demo account."), code: j.code as string | undefined };
    return { ok: true, user: j.user as User };
  } catch {
    return { ok: false, error: "You're offline." };
  }
}

/** Make the local user match the server session (the cookie is the source of truth). */
async function reconcile() {
  try {
    const res = await fetch("/api/auth", { cache: "no-store" });
    if (!res.ok) return;
    const j = (await res.json()) as { mode?: string; user?: User | null; reason?: string };
    if (j.mode === "local") return; // no backend: keep the local sign-in
    const local = useApp.getState().user;
    if (j.user) {
      if (!local || local.phone !== j.user.phone || local.role !== j.user.role || local.businessId !== j.user.businessId || local.name !== j.user.name)
        useApp.getState().signIn(j.user);
    } else if (local) {
      useApp.getState().signOut();
      toast({ title: "Signed out", body: j.reason ?? "Please sign in again with your email.", tone: j.reason ? "error" : "default" });
    }
  } catch {
    /* offline: keep what we have */
  }
}

/** Called once from <Providers> after the stores rehydrate. */
export function initSync() {
  if (started) return;
  started = true;

  reconcile().then(() => pull());

  let prev = useApp.getState().user;
  useApp.subscribe((s) => {
    if (s.user === prev) return;
    const was = prev;
    prev = s.user;
    // Sign-in already set the cookie (via /api/auth or /api/session); just refresh the data.
    if (s.user && (s.user.phone !== was?.phone || s.user.businessId !== was?.businessId)) pull(true);
    else if (!s.user) fetch("/api/auth", { method: "DELETE" }).finally(() => pull(true));
  });

  window.addEventListener("focus", () => pull());
  setInterval(() => document.visibilityState === "visible" && pull(), 20_000);
}

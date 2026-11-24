"use client";

import { getEngine } from "./db";
import type { EngineKey } from "./engines";
import { toast, withUser, type User } from "./store";

/**
 * Browser-side engine gate (Admin → Engines). The server refuses the same actions; this just stops
 * people before they fill in a form for something that's paused.
 */

/** True (and tells the person why) if the engine is paused. */
export function paused(key: EngineKey) {
  const e = getEngine(key);
  if (e.running) return false;
  toast({ title: "Not available right now", body: e.message, tone: "error" });
  return true;
}

/** Run `fn` if the engine is running and someone is signed in (opens sign-in for guests). */
export function act(key: EngineKey, fn: (u: User) => void) {
  if (paused(key)) return;
  withUser(fn);
}

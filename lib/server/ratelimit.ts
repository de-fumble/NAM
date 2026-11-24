import "server-only";

/**
 * In-memory sliding-window limiter. Per server instance, so it slows abuse rather than
 * guaranteeing a global cap — good enough for sign-in attempts and paid API lookups.
 */
const g = globalThis as unknown as { __namLimits?: Map<string, number[]> };
const hits = (g.__namLimits ??= new Map());

export function allow(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t: number) => now - t < windowMs);
  const ok = list.length < max;
  if (ok) list.push(now);
  hits.set(key, list);
  if (hits.size > 10_000) hits.delete(hits.keys().next().value!);
  return ok;
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";

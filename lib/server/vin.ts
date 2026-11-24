import "server-only";
import { cleanVin, isVin, type VinReport, type VinResult } from "../vin";
import { allow } from "./ratelimit";

/**
 * auto.dev VIN decoder. The free plan covers `/vin` only (recalls, specs and plate need Growth/Scale).
 * Results are cached per VIN so repeat lookups — the sell wizard and then the listing check — cost one call.
 */
const API = "https://api.auto.dev/vin/";
const TTL = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHE = 2000;

type Cached = { at: number; result: VinResult };
const g = globalThis as unknown as { __namVin?: Map<string, Cached> };
const cache = (g.__namVin ??= new Map());

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Copy only the vehicle fields — auto.dev also returns the account holder's name, email and IP, which must never leave the server. */
function normalize(vin: string, j: Record<string, unknown>): VinReport {
  const v = (j.vehicle ?? {}) as Record<string, unknown>;
  return {
    vin,
    year: n(j.year) ?? n(v.year),
    make: s(j.make) || s(v.make),
    model: s(j.model) || s(v.model),
    trim: s(j.trim),
    body: s(j.body) || s(j.style),
    engine: s(j.engine),
    drive: s(j.drive),
    transmission: s(j.transmission),
    fuel: s(j.fuel),
    doors: n(j.doors),
    origin: s(j.origin),
    manufacturer: s(v.manufacturer),
    checksum: j.checksum === true,
    yearAmbiguous: j.yearAmbiguous === true || j.ambiguous === true,
  };
}

function remember(vin: string, result: VinResult) {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
  cache.set(vin, { at: Date.now(), result });
  return result;
}

export const vinConfigured = () => !!process.env.AUTODEV_API_KEY;

export async function decodeVin(input: string): Promise<VinResult> {
  const vin = cleanVin(input);
  if (!isVin(vin) || input.replace(/[\s-]/g, "").length !== 17)
    return { ok: false, code: "INVALID", message: "A VIN is exactly 17 letters and numbers (never I, O or Q)." };

  const hit = cache.get(vin);
  if (hit && Date.now() - hit.at < TTL) return hit.result;

  const key = process.env.AUTODEV_API_KEY;
  if (!key) return { ok: false, code: "UNAVAILABLE", message: "VIN checks aren't set up yet." };

  let res: Response;
  try {
    res = await fetch(API + vin, {
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    return { ok: false, code: "UNAVAILABLE", message: "The VIN service didn't respond. Try again in a moment." };
  }

  const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 429) return { ok: false, code: "RATE_LIMITED", message: "Too many VIN checks right now. Try again in a minute." };
  if (!res.ok) {
    console.error("[vin] auto.dev", res.status, s(j.code) || s(j.error));
    return { ok: false, code: "UNAVAILABLE", message: "The VIN service is unavailable. Try again shortly." };
  }

  // 207 + no_vin_record (or no year) → the decoder doesn't know this VIN.
  const report = normalize(vin, j);
  if (j.reason === "no_vin_record" || j.vinValid === false || !report.make || !report.year)
    return remember(vin, { ok: false, code: "NOT_FOUND", message: "We couldn't find a vehicle for this VIN. Check it against the dashboard plate or the papers." });

  return remember(vin, { ok: true, report });
}

/** Per-caller limit on uncached lookups: `max` per `windowMs`. */
export const allowLookup = (who: string, max = 12, windowMs = 60_000) => allow(`vin:${who}`, max, windowMs);

export const isCached = (vin: string) => {
  const hit = cache.get(cleanVin(vin));
  return !!hit && Date.now() - hit.at < TTL;
};

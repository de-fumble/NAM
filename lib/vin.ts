/**
 * VIN helpers shared by the browser and the server.
 * Decoding itself happens server-side (lib/server/vin.ts) so the auto.dev key never reaches the client.
 */
import type { Body, Fuel } from "./data/cars";

/** Normalised decode result — the only shape that leaves the server. */
export interface VinReport {
  vin: string;
  year: number | null;
  make: string;
  model: string;
  trim: string;
  body: string;
  engine: string;
  drive: string;
  transmission: string;
  fuel: string;
  doors: number | null;
  origin: string;
  manufacturer: string;
  /** ISO 3779 check digit. Mandatory for North-American cars only, so `false` is a caution, not a failure. */
  checksum: boolean;
  /** Two possible model years (e.g. 1989 / 2019) and the decoder couldn't pick one. */
  yearAmbiguous: boolean;
}

export type VinResult =
  | { ok: true; report: VinReport }
  | { ok: false; code: "INVALID" | "NOT_FOUND" | "RATE_LIMITED" | "UNAVAILABLE" | "SIGN_IN" | "PAUSED"; message: string };

/** Upper-case and drop anything a VIN can't contain (I, O and Q are never used). */
export const cleanVin = (v: string) => v.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17);
export const isVin = (v: string) => /^[A-HJ-NPR-Z0-9]{17}$/.test(v);

export const SAMPLE_VIN = "JTEMU5JRXP6089739"; // 2023 Toyota 4Runner SR5 — decodes on the free plan

/* ----------------------- map decoder values onto ours ----------------------- */

const MAKE_ALIASES: Record<string, string> = {
  "MERCEDES BENZ": "Mercedes-Benz", "MERCEDES-BENZ": "Mercedes-Benz", MERCEDES: "Mercedes-Benz",
  VW: "Volkswagen", "LAND ROVER": "Land Rover", LANDROVER: "Land Rover", BMW: "BMW", GMC: "GMC", KIA: "Kia",
};

/** "TOYOTA" → "Toyota", "MERCEDES-BENZ" → "Mercedes-Benz", matching the marketplace's spelling when it knows the make. */
export function normalizeMake(raw: string, known: readonly string[] = []) {
  const up = raw.trim().toUpperCase();
  if (!up) return "";
  const hit = known.find((m) => m.toUpperCase() === up);
  if (hit) return hit;
  if (MAKE_ALIASES[up]) return MAKE_ALIASES[up];
  return up.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
}

export function toBody(raw: string): Body | "" {
  const s = raw.toLowerCase();
  if (!s) return "";
  if (/convertible|cabrio|roadster|spyder|spider/.test(s)) return "Convertible";
  if (/coupe/.test(s)) return "Coupe";
  if (/pickup|crew cab|extended cab|regular cab|truck/.test(s)) return "Pickup";
  if (/sport utility|suv|crossover/.test(s)) return "SUV";
  if (/hatch|wagon/.test(s)) return "Hatchback";
  if (/sedan|saloon/.test(s)) return "Sedan";
  if (/motorcycle|motorbike/.test(s)) return "Motorbike";
  return "";
}

export function toFuel(raw: string): Fuel | "" {
  const s = raw.toLowerCase();
  if (!s) return "";
  if (/hybrid/.test(s)) return "Hybrid";
  if (/electric/.test(s)) return "Electric";
  if (/diesel/.test(s)) return "Diesel";
  if (/gas|petrol|flex/.test(s)) return "Petrol";
  return "";
}

export function toTransmission(raw: string): "Automatic" | "Manual" | "" {
  const s = raw.toLowerCase();
  if (/manual/.test(s)) return "Manual";
  if (/auto|cvt|direct drive/.test(s)) return "Automatic";
  return "";
}

/** Does a decoded VIN agree with what the seller typed? Make + year, case-insensitive. */
export function vinMatches(r: Pick<VinReport, "make" | "year">, make: string, year: number) {
  const a = normalizeMake(r.make).toLowerCase();
  const b = normalizeMake(make).toLowerCase();
  return !!a && !!b && (a === b || a.startsWith(b) || b.startsWith(a)) && r.year === year;
}

export const vinTitle = (r: VinReport) => [r.year, normalizeMake(r.make), r.model].filter(Boolean).join(" ");

/** Browser → our own /api/vin route (never auto.dev directly). */
export async function lookupVin(vin: string): Promise<VinResult> {
  try {
    const res = await fetch(`/api/vin/${encodeURIComponent(cleanVin(vin))}`);
    const j = (await res.json()) as VinResult;
    if (typeof j?.ok === "boolean") return j;
  } catch {}
  return { ok: false, code: "UNAVAILABLE", message: "Couldn't reach the VIN service. Check your connection." };
}

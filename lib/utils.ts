import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Unsplash image URL with on-the-fly resizing. Optional focal-point zoom for detail crops. */
export const slug = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function img(
  id: string,
  w = 1200,
  opts: { h?: number; q?: number; fx?: number; fy?: number; z?: number } = {},
) {
  if (id.startsWith("data:") || id.startsWith("http") || id.startsWith("blob:") || id.startsWith("/")) return id;
  const p = new URLSearchParams({ auto: "format", fit: "crop", w: String(w), q: String(opts.q ?? 80) });
  if (opts.h) p.set("h", String(opts.h));
  if (opts.z) {
    p.set("crop", "focalpoint");
    p.set("fp-x", String(opts.fx ?? 0.5));
    p.set("fp-y", String(opts.fy ?? 0.5));
    p.set("fp-z", String(opts.z));
  }
  return `https://images.unsplash.com/photo-${id}?${p.toString()}`;
}

export function naira(n: number) {
  return "₦" + Math.round(n).toLocaleString("en-NG");
}

export function nairaShort(n: number) {
  if (n >= 1_000_000_000) return `₦${+(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `₦${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${+(n / 1_000).toFixed(0)}K`;
  return `₦${n}`;
}

export function km(n: number) {
  return n === 0 ? "0 km" : `${n.toLocaleString("en-NG")} km`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Monthly payment on an amortised loan. rate = annual % */
export function monthlyPayment(principal: number, rate: number, months: number) {
  const r = rate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

/**
 * Engines — every switchable part of the marketplace, controlled from Admin → Engines.
 *
 * Shared by the browser and the server. The server is the authority: every write that an engine
 * covers is refused while it's paused (app/api/sync, /api/auth, /api/session, /api/vin). The browser
 * reads the same state to stop people early and to show the same prices the server will charge.
 *
 * Each engine has:
 * - `on`       the master switch
 * - `from`/`until` an optional window (ISO times). Outside it the engine behaves as switched off.
 * - `hours`    optional daily opening hours in Lagos time ("08:00"–"20:00"; may wrap past midnight)
 * - `message`  what people see while it's paused (falls back to the engine's default)
 * - `params`   the engine's own settings (fees, limits, rules)
 *
 * Two engines work the other way round: `maintenance` and `announcement` *do something* while running
 * (take the site offline, show a banner), so scheduling them means "between these times".
 */

export type EngineKey =
  | "maintenance" | "announcement" | "signups" | "demo"
  | "listings" | "messaging" | "offers" | "inspections"
  | "parts" | "partRequests" | "rentals"
  | "services" | "finance" | "vin";

export type ParamValue = number | boolean | string;

export type ParamDef =
  | { key: string; label: string; hint?: string; type: "number"; unit?: "naira" | "percent" | "days" | "hours" | "count" | "chars" | "perMin"; min: number; max: number; step?: number; default: number }
  | { key: string; label: string; hint?: string; type: "bool"; default: boolean }
  | { key: string; label: string; hint?: string; type: "text"; max: number; default: string }
  | { key: string; label: string; hint?: string; type: "select"; options: { value: string; label: string }[]; default: string };

export type EngineGroup = "Platform" | "Accounts" | "Marketplace" | "Commerce" | "Tools";

export interface EngineDef {
  key: EngineKey;
  name: string;
  group: EngineGroup;
  /** What it controls, for the admin. */
  summary: string;
  /** What switching it off does, for the admin. */
  offEffect: string;
  /** Default text shown to people while it's paused. */
  pausedText: string;
  /** Running means the effect is on (maintenance, announcement) rather than a feature being available. */
  effect?: boolean;
  defaultOn: boolean;
  params: ParamDef[];
}

export interface EngineState {
  on: boolean;
  from: string | null;
  until: string | null;
  hours: { start: string; end: string } | null;
  message: string;
  params: Record<string, ParamValue>;
}

export type Engines = Record<EngineKey, EngineState>;

/* ─────────────────────────────── Registry ─────────────────────────────── */

export const ENGINE_DEFS: EngineDef[] = [
  {
    key: "maintenance", name: "Maintenance mode", group: "Platform", effect: true, defaultOn: false,
    summary: "Takes the whole marketplace offline behind a maintenance screen. This console keeps working.",
    offEffect: "Running: shoppers and businesses see the maintenance screen and every change is refused.",
    pausedText: "We're making improvements and will be back shortly.",
    params: [],
  },
  {
    key: "announcement", name: "Site announcement", group: "Platform", effect: true, defaultOn: false,
    summary: "A banner under the navigation on every page. Schedule it to appear and disappear on its own.",
    offEffect: "Off: no banner.",
    pausedText: "",
    params: [
      { key: "text", label: "Message", type: "text", max: 240, default: "", hint: "Up to 240 characters." },
      { key: "tone", label: "Style", type: "select", options: [{ value: "info", label: "Information" }, { value: "warning", label: "Warning" }], default: "info" },
    ],
  },
  {
    key: "signups", name: "Sign-ups", group: "Accounts", defaultOn: true,
    summary: "New accounts. Existing users can always sign in.",
    offEffect: "Off: nobody can create an account.",
    pausedText: "New sign-ups are paused right now. Please check back soon.",
    params: [
      { key: "emailVerification", label: "Require email verification", type: "bool", default: true, hint: "New accounts must click the link in a confirmation email before they can sign in." },
      { key: "businessAccounts", label: "Allow business accounts", type: "bool", default: true, hint: "Dealers, rental companies and parts sellers. Off: only shopper accounts can be created." },
    ],
  },
  {
    key: "demo", name: "Demo accounts", group: "Accounts", defaultOn: true,
    summary: "The one-tap demo dealer, rental, parts and shopper accounts. Only available on stock data.",
    offEffect: "Off: demo accounts are hidden and signed out.",
    pausedText: "Demo accounts are switched off. Sign in with your own account.",
    params: [],
  },
  {
    key: "listings", name: "Car listings", group: "Marketplace", defaultOn: true,
    summary: "People and dealers listing cars for sale.",
    offEffect: "Off: no new listings. Existing listings stay up and sellers can still edit them.",
    pausedText: "New listings are paused right now. Please try again later.",
    params: [
      { key: "requireVin", label: "Require a valid VIN", type: "bool", default: false, hint: "Listings without a 17-character VIN are refused." },
      { key: "maxPhotos", label: "Photos per listing", type: "number", unit: "count", min: 1, max: 8, default: 8 },
      { key: "privateLimit", label: "Active listings per private seller", type: "number", unit: "count", min: 0, max: 100, default: 0, hint: "0 means no limit. Dealers aren't limited." },
    ],
  },
  {
    key: "messaging", name: "Messaging", group: "Marketplace", defaultOn: true,
    summary: "Chat between shoppers and businesses.",
    offEffect: "Off: nobody can send messages. Existing conversations stay readable.",
    pausedText: "Messaging is paused right now. Please try again later.",
    params: [{ key: "maxLength", label: "Longest message", type: "number", unit: "chars", min: 100, max: 4000, step: 100, default: 4000 }],
  },
  {
    key: "offers", name: "Offers", group: "Marketplace", defaultOn: true,
    summary: "Shoppers making price offers on cars.",
    offEffect: "Off: the offer button is refused.",
    pausedText: "Offers are paused right now. You can still message the seller.",
    params: [{ key: "minPercent", label: "Lowest offer", type: "number", unit: "percent", min: 50, max: 100, default: 75, hint: "As a share of the asking price." }],
  },
  {
    key: "inspections", name: "Inspections", group: "Marketplace", defaultOn: true,
    summary: "Booking a pre-purchase inspection from a car's page.",
    offEffect: "Off: no new inspection bookings.",
    pausedText: "Inspection bookings are paused right now.",
    params: [
      { key: "essentialPrice", label: "Essential inspection", type: "number", unit: "naira", min: 0, max: 1_000_000, step: 1000, default: 35_000 },
      { key: "completePrice", label: "Complete inspection", type: "number", unit: "naira", min: 0, max: 1_000_000, step: 1000, default: 63_000 },
    ],
  },
  {
    key: "parts", name: "Parts shop", group: "Commerce", defaultOn: true,
    summary: "Adding parts to the bag and checking out.",
    offEffect: "Off: no new orders. Sellers can still ship orders already placed.",
    pausedText: "The parts shop is paused right now. Please try again later.",
    params: [
      { key: "freeDeliveryOver", label: "Free delivery over", type: "number", unit: "naira", min: 0, max: 10_000_000, step: 5000, default: 150_000, hint: "0 means delivery is always charged." },
      { key: "deliveryMetro", label: "Delivery, Lagos and Abuja", type: "number", unit: "naira", min: 0, max: 100_000, step: 500, default: 3_500 },
      { key: "deliveryElsewhere", label: "Delivery, other states", type: "number", unit: "naira", min: 0, max: 100_000, step: 500, default: 6_500 },
      { key: "vatPercent", label: "VAT", type: "number", unit: "percent", min: 0, max: 25, step: 0.5, default: 7.5 },
      { key: "maxQty", label: "Most of one item per order", type: "number", unit: "count", min: 1, max: 100, default: 20 },
    ],
  },
  {
    key: "partRequests", name: "Part requests", group: "Commerce", defaultOn: true,
    summary: "Shoppers asking for hard-to-find parts and sellers quoting on them.",
    offEffect: "Off: no new requests or quotes.",
    pausedText: "Part requests are paused right now.",
    params: [{ key: "maxOpen", label: "Open requests per shopper", type: "number", unit: "count", min: 0, max: 50, default: 5, hint: "0 means no limit." }],
  },
  {
    key: "rentals", name: "Rentals", group: "Commerce", defaultOn: true,
    summary: "Reserving rental cars, with or without a chauffeur.",
    offEffect: "Off: no new reservations. Companies can still run trips already booked.",
    pausedText: "Rental bookings are paused right now. Please try again later.",
    params: [
      { key: "chauffeurFee", label: "Chauffeur fee per day", type: "number", unit: "naira", min: 0, max: 500_000, step: 1000, default: 15_000, hint: "Added when a self-drive car is booked with a driver." },
      { key: "deposit", label: "Self-drive caution deposit", type: "number", unit: "naira", min: 0, max: 5_000_000, step: 5000, default: 100_000 },
      { key: "maxDays", label: "Longest booking", type: "number", unit: "days", min: 1, max: 365, default: 60 },
      { key: "cancelHours", label: "Free cancellation until", type: "number", unit: "hours", min: 0, max: 168, default: 24, hint: "Hours before pickup. After that, a confirmed booking can't be cancelled by the renter." },
      { key: "preventOverlap", label: "Block double bookings", type: "bool", default: true, hint: "A car can't be reserved for dates it's already booked." },
      { key: "autoConfirm", label: "Confirm bookings automatically", type: "bool", default: false, hint: "Skip the rental company's approval step." },
    ],
  },
  {
    key: "services", name: "Services", group: "Tools", defaultOn: true,
    summary: "Posting jobs, booking pros and messaging them.",
    offEffect: "Off: pros can be browsed but not booked.",
    pausedText: "Service bookings are paused right now.",
    params: [],
  },
  {
    key: "finance", name: "Finance and insurance", group: "Tools", defaultOn: true,
    summary: "Loan eligibility checks and insurance quotes. The duty estimator always works.",
    offEffect: "Off: eligibility checks and quotes are refused.",
    pausedText: "Finance applications are paused right now.",
    params: [],
  },
  {
    key: "vin", name: "VIN check", group: "Tools", defaultOn: true,
    summary: "Decoding VINs on the VIN check page and when listing a car (auto.dev).",
    offEffect: "Off: VIN checks are refused and listings aren't VIN-matched.",
    pausedText: "VIN checks are paused right now.",
    params: [
      { key: "requireSignIn", label: "Require an account", type: "bool", default: true, hint: "Each check costs an auto.dev call." },
      { key: "perMinute", label: "Checks per minute, per person", type: "number", unit: "perMin", min: 1, max: 120, default: 12 },
    ],
  },
];

export const ENGINE_BY_KEY = Object.fromEntries(ENGINE_DEFS.map((d) => [d.key, d])) as Record<EngineKey, EngineDef>;
export const ENGINE_KEYS = ENGINE_DEFS.map((d) => d.key);

const defaultState = (d: EngineDef): EngineState => ({
  on: d.defaultOn, from: null, until: null, hours: null, message: "",
  params: Object.fromEntries(d.params.map((p) => [p.key, p.default])),
});

export const DEFAULT_ENGINES = Object.fromEntries(ENGINE_DEFS.map((d) => [d.key, defaultState(d)])) as Engines;

/* ─────────────────────────────── Validation ─────────────────────────────── */

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const isoOrNull = (v: unknown) => {
  if (typeof v !== "string" || !v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

function cleanParam(p: ParamDef, v: unknown): ParamValue {
  switch (p.type) {
    case "number": {
      const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
      if (!Number.isFinite(n)) return p.default;
      const step = p.step ?? 1;
      return Math.min(p.max, Math.max(p.min, Math.round(n / step) * step));
    }
    case "bool":
      return typeof v === "boolean" ? v : p.default;
    case "text":
      return typeof v === "string" ? v.slice(0, p.max) : p.default;
    case "select":
      return typeof v === "string" && p.options.some((o) => o.value === v) ? v : p.default;
  }
}

/** One engine's state, with every field checked and clamped. Unknown fields are dropped. */
export function cleanEngine(key: EngineKey, raw: unknown): EngineState {
  const d = ENGINE_BY_KEY[key];
  const base = defaultState(d);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<EngineState> & { params?: Record<string, unknown> };
  const hours = r.hours && HHMM.test(r.hours.start) && HHMM.test(r.hours.end) && r.hours.start !== r.hours.end ? { start: r.hours.start, end: r.hours.end } : null;
  return {
    on: typeof r.on === "boolean" ? r.on : base.on,
    from: isoOrNull(r.from),
    until: isoOrNull(r.until),
    hours,
    message: typeof r.message === "string" ? r.message.slice(0, 240) : "",
    params: Object.fromEntries(d.params.map((p) => [p.key, cleanParam(p, r.params?.[p.key])])),
  };
}

/** Every engine, filling anything missing with defaults. Safe on any input. */
export function cleanEngines(raw: unknown): Engines {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(ENGINE_KEYS.map((k) => [k, cleanEngine(k, src[k])])) as Engines;
}

/* ─────────────────────────────── Scheduling ─────────────────────────────── */

export type EngineStatus = "running" | "off" | "scheduled" | "ended" | "closed";

/** Minutes past midnight in Lagos (WAT, UTC+1, no daylight saving). */
export function lagosMinutes(now: number) {
  const d = new Date(now + 60 * 60_000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
const mins = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Is `now` inside the daily hours? Handles windows that wrap past midnight (22:00–06:00). */
export function withinHours(h: EngineState["hours"], now: number) {
  if (!h) return true;
  const m = lagosMinutes(now);
  const a = mins(h.start);
  const b = mins(h.end);
  return a < b ? m >= a && m < b : m >= a || m < b;
}

export function engineStatus(s: EngineState | undefined, now = Date.now()): EngineStatus {
  if (!s?.on) return "off";
  if (s.from && now < Date.parse(s.from)) return "scheduled";
  if (s.until && now >= Date.parse(s.until)) return "ended";
  if (!withinHours(s.hours, now)) return "closed";
  return "running";
}

export const engineRunning = (s: EngineState | undefined, now = Date.now()) => engineStatus(s, now) === "running";

/** What a person sees when they try to use a paused engine. */
export function pausedMessage(key: EngineKey, s: EngineState | undefined, now = Date.now()) {
  const custom = s?.message?.trim();
  if (custom) return custom;
  const d = ENGINE_BY_KEY[key];
  const status = engineStatus(s, now);
  if (status === "closed" && s?.hours) return `${d.name}: available from ${s.hours.start} to ${s.hours.end}, Lagos time.`;
  if (status === "scheduled" && s?.from) return `${d.name}: opening ${fmtWhen(s.from)}.`;
  return d.pausedText;
}

export const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/* ───────────────────── Pricing — one source for browser and server ───────────────────── */

type P = Record<string, ParamValue>;
const n = (p: P, k: string) => Number(p[k]);

export const METRO_STATES = ["Lagos", "FCT Abuja"];

/** Parts order totals. */
export function partsTotals(subtotal: number, state: string, p: P) {
  const freeOver = n(p, "freeDeliveryOver");
  const free = subtotal === 0 || (freeOver > 0 && subtotal >= freeOver);
  const delivery = free ? 0 : METRO_STATES.includes(state) ? n(p, "deliveryMetro") : n(p, "deliveryElsewhere");
  const vat = Math.round((subtotal * n(p, "vatPercent")) / 100);
  return { delivery, vat, total: subtotal + delivery + vat, freeOver, vatPercent: n(p, "vatPercent") };
}

/** Rental quote. `selfDrive`: the car can be driven by the renter (so a chauffeur costs extra). */
export function rentalQuote(daily: number, days: number, driver: boolean, selfDrive: boolean, p: P) {
  const fee = driver && selfDrive ? n(p, "chauffeurFee") : 0;
  const deposit = driver ? 0 : n(p, "deposit");
  const rent = daily * days;
  return { fee, deposit, rent, total: (daily + fee) * days + deposit, perDay: daily + fee };
}

export const inspectionPrice = (plan: "essential" | "complete" | string, p: P) =>
  n(p, plan.toLowerCase() === "essential" ? "essentialPrice" : "completePrice");

/** Date ranges as [from, to) — the return day is free for the next renter. */
export const overlaps = (aFrom: string, aTo: string, bFrom: string, bTo: string) => aFrom < bTo && bFrom < aTo;

/** Booking statuses that hold a car. */
export const HOLDING = ["pending", "confirmed", "active"] as const;

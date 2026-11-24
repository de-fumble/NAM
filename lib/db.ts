"use client";

/**
 * Client-side marketplace database.
 *
 * Every buyer action (messages, offers, inspection bookings, parts orders, rental reservations,
 * part requests, new listings) is written here and read by the matching business dashboard.
 * It persists to localStorage so the whole two-sided flow works in one browser. The action
 * surface mirrors what a real API would expose — swap the store for fetch calls to go live.
 */

import { useMemo, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { BUSINESSES, DEMO_ACCOUNTS, type Business } from "./data/businesses";
import { CARS, setSellerResolver, type Car, type Seller } from "./data/cars";
import { PARTS, type Part } from "./data/parts";
import { RENTALS, type Rental } from "./data/rentals";
import { buildSeed } from "./seed";
import { pull, push } from "./sync";

/* --------------------------------- Types --------------------------------- */

export interface Person {
  name: string;
  phone: string;
}

/** `removed` is set by admins (moderation). */
export type ListingStatus = "active" | "paused" | "sold" | "removed";
export type FleetStatus = "available" | "maintenance" | "removed";
export type LeadStage = "new" | "contacted" | "viewing" | "negotiating" | "won" | "lost";
export type OrderStatus = "placed" | "packed" | "shipped" | "delivered" | "cancelled";
export type BookingStatus = "pending" | "confirmed" | "active" | "completed" | "declined" | "cancelled";

export interface Lead {
  id: string;
  carId: string;
  businessId: string;
  customer: Person;
  kind: "message" | "offer" | "inspection" | "call";
  amount?: number;
  note: string;
  stage: LeadStage;
  at: number;
}

export interface Message {
  from: "customer" | "business";
  text: string;
  at: number;
}

export interface Thread {
  id: string;
  businessId: string;
  customer: Person;
  topic: { kind: "car" | "part" | "rental" | "request" | "general"; id?: string; title: string };
  messages: Message[];
  unreadBiz: number;
  unreadCust: number;
  at: number;
}

export interface OrderLine {
  partId: string;
  name: string;
  qty: number;
  price: number;
  sellerId: string;
}

export interface Order {
  id: string;
  customer: Person;
  address: string;
  state: string;
  pay: string;
  lines: OrderLine[];
  subtotal: number;
  delivery: number;
  vat: number;
  total: number;
  fulfil: Record<string, OrderStatus>;
  at: number;
}

export interface Booking {
  id: string;
  rentalId: string;
  companyId: string;
  vehicle: string;
  customer: Person;
  city: string;
  from: string;
  to: string;
  days: number;
  driver: boolean;
  total: number;
  status: BookingStatus;
  at: number;
}

export interface Quote {
  businessId: string;
  price: number;
  note: string;
  at: number;
}

export interface PartRequest {
  id: string;
  customer: Person;
  part: string;
  vehicle: string;
  state: string;
  note: string;
  quotes: Quote[];
  status: "open" | "closed";
  at: number;
}

export interface Inspection {
  id: string;
  carId: string;
  businessId: string;
  customer: Person;
  date: string;
  slot: string;
  plan: string;
  price: number;
  at: number;
}

export type CarPatch = { price?: number; status?: ListingStatus; featured?: boolean };
export type PartPatch = { price?: number; stock?: number; active?: boolean };
export type FleetPatch = { daily?: number; status?: FleetStatus };

import { DEFAULT_SETTINGS, type DataMode, type PlatformSettings } from "./settings";
import { DEFAULT_ENGINES, engineRunning, pausedMessage, type EngineKey, type Engines } from "./engines";
export { DEFAULT_SETTINGS, type DataMode, type PlatformSettings };

/** What /api/sync returns: public catalogue state + the signed-in user's own activity. */
export interface Snapshot {
  /** `demo_off`: a demo account while the platform is on live data — the client signs it out. */
  me: { status: "active" | "suspended" | "demo_off" } | null;
  settings: PlatformSettings;
  businesses: Business[];
  listings: (Car & { createdAt: number })[];
  carPatch: Record<string, CarPatch>;
  parts: Part[];
  partPatch: Record<string, PartPatch>;
  fleet: Rental[];
  fleetPatch: Record<string, FleetPatch>;
  /** Date ranges [from, to) each rental car is already held for (no renter details). */
  fleetBusy: Record<string, [string, string][]>;
  leads: Lead[];
  threads: Thread[];
  orders: Order[];
  bookings: Booking[];
  requests: PartRequest[];
  inspections: Inspection[];
}

interface DB extends Omit<Snapshot, "me"> {
  seeded: boolean;
  /** True once the server answered — writes are then mirrored to Supabase. */
  remote: boolean;
  syncedAt: number;

  seed: () => void;
  reset: () => void;
  applySnapshot: (s: Snapshot) => void;
  createBusiness: (b: Business) => void;
  updateBusiness: (id: string, patch: Partial<Business>) => void;
  addListing: (c: Car) => void;
  patchCar: (id: string, p: CarPatch) => void;
  addPart: (p: Part) => void;
  patchPart: (id: string, p: PartPatch) => void;
  addVehicle: (r: Rental) => void;
  patchVehicle: (id: string, p: FleetPatch) => void;
  addLead: (l: Omit<Lead, "id" | "at" | "stage">) => void;
  setLeadStage: (id: string, stage: LeadStage) => void;
  send: (a: { businessId: string; customer: Person; topic: Thread["topic"]; from: Message["from"]; text: string }) => string;
  reply: (threadId: string, from: Message["from"], text: string) => void;
  markRead: (threadId: string, side: "biz" | "cust") => void;
  placeOrder: (o: Omit<Order, "id" | "at" | "fulfil">) => string;
  advanceOrder: (orderId: string, sellerId: string) => void;
  book: (b: Omit<Booking, "id" | "at" | "status">) => string;
  setBooking: (id: string, status: BookingStatus) => void;
  postRequest: (r: Omit<PartRequest, "id" | "at" | "quotes" | "status">) => void;
  quote: (requestId: string, q: Omit<Quote, "at">) => void;
  closeRequest: (id: string) => void;
  addInspection: (i: Omit<Inspection, "id" | "at">) => void;
}

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
export const ORDER_FLOW: OrderStatus[] = ["placed", "packed", "shipped", "delivered"];

const empty: Omit<Snapshot, "me"> & Pick<DB, "seeded" | "remote" | "syncedAt"> = {
  seeded: false,
  remote: false,
  syncedAt: 0,
  settings: DEFAULT_SETTINGS,
  businesses: [],
  listings: [],
  carPatch: {},
  parts: [],
  partPatch: {},
  fleet: [],
  fleetPatch: {},
  fleetBusy: {},
  leads: [],
  threads: [],
  orders: [],
  bookings: [],
  requests: [],
  inspections: [],
};

function bump(t: Thread, from: Message["from"], text: string): Thread {
  const msg: Message = { from, text, at: Date.now() };
  return { ...t, messages: [...t.messages, msg], at: msg.at, unreadBiz: t.unreadBiz + (from === "customer" ? 1 : 0), unreadCust: t.unreadCust + (from === "business" ? 1 : 0) };
}

export const useDB = create<DB>()(
  persist(
    (set, get) => ({
      ...empty,

      seed: () => {
        if (get().seeded || get().remote) return;
        set({ ...buildSeed(Date.now()), seeded: true });
      },
      reset: () => {
        if (get().remote) return void pull(true);
        set({ ...empty, ...buildSeed(Date.now()), seeded: true });
      },
      applySnapshot: (snap) => {
        const { me: _me, ...rest } = snap;
        set({ ...rest, settings: { ...DEFAULT_SETTINGS, ...rest.settings }, remote: true, seeded: true, syncedAt: Date.now() });
      },

      // Local only — the business is sent to the server with the session (see lib/sync.ts).
      createBusiness: (b) => set({ businesses: [...get().businesses.filter((x) => x.id !== b.id), b] }),
      updateBusiness: (id, patch) => {
        set({ businesses: upsertBiz(get().businesses, id, patch) });
        push("business.update", { id, patch });
      },

      addListing: (c) => {
        set({ listings: [{ ...c, createdAt: Date.now() }, ...get().listings] });
        push("car.create", c);
      },
      patchCar: (id, p) => {
        set({ carPatch: { ...get().carPatch, [id]: { ...get().carPatch[id], ...p } } });
        push("car.patch", { id, ...p });
      },

      addPart: (p) => {
        set({ parts: [p, ...get().parts] });
        push("part.create", p);
      },
      patchPart: (id, p) => {
        set({ partPatch: { ...get().partPatch, [id]: { ...get().partPatch[id], ...p } } });
        push("part.patch", { id, ...p });
      },

      addVehicle: (r) => {
        set({ fleet: [r, ...get().fleet] });
        push("vehicle.create", r);
      },
      patchVehicle: (id, p) => {
        set({ fleetPatch: { ...get().fleetPatch, [id]: { ...get().fleetPatch[id], ...p } } });
        push("vehicle.patch", { id, ...p });
      },

      addLead: (l) => {
        const lead: Lead = { ...l, id: uid("lead"), at: Date.now(), stage: "new" };
        set({ leads: [lead, ...get().leads] });
        push("lead.create", lead);
      },
      setLeadStage: (id, stage) => {
        set({ leads: get().leads.map((l) => (l.id === id ? { ...l, stage } : l)) });
        push("lead.stage", { id, stage });
      },

      send: ({ businessId, customer, topic, from, text }) => {
        const threads = get().threads;
        const existing = threads.find((t) => t.businessId === businessId && t.customer.phone === customer.phone && t.topic.id === topic.id && t.topic.kind === topic.kind);
        const thread = existing ?? { id: uid("t"), businessId, customer, topic, messages: [], unreadBiz: 0, unreadCust: 0, at: Date.now() };
        set({ threads: [bump(thread, from, text), ...threads.filter((t) => t.id !== thread.id)] });
        push("message.send", { thread: { id: thread.id, businessId, customer, topic }, from, text });
        return thread.id;
      },
      reply: (threadId, from, text) => {
        const t = get().threads.find((x) => x.id === threadId);
        if (!t) return;
        set({ threads: get().threads.map((x) => (x.id === threadId ? bump(x, from, text) : x)) });
        push("message.send", { thread: { id: t.id, businessId: t.businessId, customer: t.customer, topic: t.topic }, from, text });
      },
      markRead: (threadId, side) => {
        set({ threads: get().threads.map((t) => (t.id === threadId ? { ...t, ...(side === "biz" ? { unreadBiz: 0 } : { unreadCust: 0 }) } : t)) });
        push("thread.read", { id: threadId, side });
      },

      placeOrder: (o) => {
        const id = `NAM-${Math.floor(100000 + Math.random() * 900000)}`;
        const fulfil = Object.fromEntries(Array.from(new Set(o.lines.map((l) => l.sellerId))).map((s) => [s, "placed" as OrderStatus]));
        const order: Order = { ...o, id, fulfil, at: Date.now() };
        set({ orders: [order, ...get().orders] });
        const pp = { ...get().partPatch };
        for (const l of o.lines) {
          const base = allPartsFrom(get()).find((p) => p.id === l.partId);
          if (base) pp[l.partId] = { ...pp[l.partId], stock: Math.max(0, base.stock - l.qty) };
        }
        set({ partPatch: pp });
        push("order.create", order);
        return id;
      },
      advanceOrder: (orderId, sellerId) => {
        set({
          orders: get().orders.map((o) => {
            if (o.id !== orderId) return o;
            const i = ORDER_FLOW.indexOf(o.fulfil[sellerId]);
            if (i < 0 || i >= ORDER_FLOW.length - 1) return o;
            return { ...o, fulfil: { ...o.fulfil, [sellerId]: ORDER_FLOW[i + 1] } };
          }),
        });
        push("order.advance", { orderId, sellerId });
      },

      book: (b) => {
        const auto = !!getEngine("rentals").params.autoConfirm;
        const booking: Booking = { ...b, id: `RB-${Math.floor(10000 + Math.random() * 90000)}`, status: auto ? "confirmed" : "pending", at: Date.now() };
        const busy = get().fleetBusy ?? {};
        set({ bookings: [booking, ...get().bookings], fleetBusy: { ...busy, [b.rentalId]: [...(busy[b.rentalId] ?? []), [b.from, b.to]] } });
        push("booking.create", booking);
        return booking.id;
      },
      setBooking: (id, status) => {
        set({ bookings: get().bookings.map((b) => (b.id === id ? { ...b, status } : b)) });
        push("booking.status", { id, status });
      },

      postRequest: (r) => {
        const req: PartRequest = { ...r, id: uid("rq"), at: Date.now(), quotes: [], status: "open" };
        set({ requests: [req, ...get().requests] });
        push("request.create", req);
      },
      quote: (requestId, q) => {
        set({
          requests: get().requests.map((r) =>
            r.id === requestId ? { ...r, quotes: [...r.quotes.filter((x) => x.businessId !== q.businessId), { ...q, at: Date.now() }] } : r,
          ),
        });
        push("request.quote", { requestId, ...q });
      },
      closeRequest: (id) => {
        set({ requests: get().requests.map((r) => (r.id === id ? { ...r, status: "closed" } : r)) });
        push("request.close", { id });
      },

      addInspection: (i) => {
        const ins: Inspection = { ...i, id: uid("ins"), at: Date.now() };
        set({ inspections: [ins, ...get().inspections] });
        push("inspection.create", ins);
      },
    }),
    {
      name: "nam-db",
      version: 3,
      // v1 caches predate server sync, v2 predates engines — drop them and reseed.
      migrate: () => ({ ...empty }) as unknown as DB,
      storage: createJSONStorage(() => (typeof window === "undefined" ? undefined : window.localStorage) as Storage),
      skipHydration: true,
      partialize: (s) => ({ ...s, remote: false }) as DB,
    },
  ),
);

const noSubscribe = () => () => {};
/** False on the server and during the hydration render, true afterwards. */
export function useHydrated() {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}
/**
 * Read the store, but return what the server rendered (the empty store) until hydration is done.
 * The persisted cache can load before a streamed page hydrates; without this, live data
 * (or any synced change) would make the first client render differ from the server HTML.
 */
function useView<K extends keyof typeof empty>(key: K): (typeof empty)[K] {
  const v = useDB((s) => s[key] as (typeof empty)[K]);
  return useHydrated() ? (v ?? empty[key]) : empty[key];
}

/** True while the marketplace runs on the built-in sample catalogue (admin → Settings → Data pipeline). */
const stockOn = (settings: PlatformSettings | undefined) => (settings?.dataMode ?? "stock") === "stock";
const stockBiz = (settings: PlatformSettings | undefined) => (stockOn(settings) ? BUSINESSES : []);

export function useDataMode(): DataMode {
  return useView("settings").dataMode ?? "stock";
}
/** Whether sample (stock) content should be shown — sample pros, testimonials, demo accounts. */
export function useStock() {
  return useDataMode() === "stock";
}

function upsertBiz(list: Business[], id: string, patch: Partial<Business>) {
  const base = list.find((b) => b.id === id) ?? BUSINESSES.find((b) => b.id === id);
  if (!base) return list;
  return [...list.filter((b) => b.id !== id), { ...base, ...patch }];
}

/* ----------------------------- Derived selectors ----------------------------- */

export function getBusiness(id: string | undefined): Business | undefined {
  if (!id) return undefined;
  const s = useDB.getState();
  return s.businesses.find((b) => b.id === id) ?? stockBiz(s.settings).find((b) => b.id === id);
}

export function useBusiness(id: string | undefined) {
  const custom = useView("businesses");
  const settings = useView("settings");
  return useMemo(() => (id ? custom.find((b) => b.id === id) ?? stockBiz(settings).find((b) => b.id === id) : undefined), [custom, settings, id]);
}

export function useBusinesses() {
  const custom = useView("businesses");
  const settings = useView("settings");
  return useMemo(() => {
    const map = new Map(stockBiz(settings).map((b) => [b.id, b]));
    for (const b of custom) map.set(b.id, b);
    return Array.from(map.values());
  }, [custom, settings]);
}

// Let cars.ts resolve sellers that only exist in the client DB (new dealers, private sellers).
setSellerResolver((id) => {
  const s = useDB.getState();
  const b = s.businesses.find((x) => x.id === id);
  if (b)
    return { id, name: b.name, type: "Dealer", city: b.city, state: b.state, rating: b.rating, reviews: b.reviews, since: b.since, responseMins: b.responseMins, verified: b.verified, listings: 1, phone: b.phone } satisfies Seller;
  const l = s.listings.find((x) => x.sellerId === id);
  if (l && id.startsWith("u:"))
    return { id, name: l.sellerName ?? "Private seller", type: "Individual", city: l.city, state: l.state, rating: 5, reviews: 0, since: 2026, responseMins: 30, verified: true, listings: 1, phone: id.slice(2) };
  return undefined;
});

type CarWithStatus = Car & { status: ListingStatus };

function allCarsFrom(s: Pick<DB, "listings" | "carPatch" | "settings">): CarWithStatus[] {
  return [...s.listings, ...(stockOn(s.settings) ? CARS : [])].map((c) => {
    const p = s.carPatch[c.id];
    return { ...c, price: p?.price ?? c.price, featured: p?.featured ?? c.featured, status: p?.status ?? "active" };
  });
}

/** Every car on the marketplace with seller edits applied (includes paused/sold). */
export function useAllCars(): CarWithStatus[] {
  const listings = useView("listings");
  const carPatch = useView("carPatch");
  const settings = useView("settings");
  return useMemo(() => allCarsFrom({ listings, carPatch, settings }), [listings, carPatch, settings]);
}

/** Ids of businesses an admin has suspended — their inventory is hidden from shoppers. */
export function useSuspended() {
  const businesses = useView("businesses");
  return useMemo(() => new Set(businesses.filter((b) => b.status === "suspended").map((b) => b.id)), [businesses]);
}

export function useSettings() {
  return useView("settings");
}

/* ------------------------------- Engines ------------------------------- */

// A shared 30-second clock, so scheduled engines open and close on screen without a reload.
let nowListeners = new Set<() => void>();
let nowValue = Date.now();
let nowTimer: ReturnType<typeof setInterval> | null = null;
function subscribeNow(cb: () => void) {
  nowListeners.add(cb);
  if (!nowTimer) nowTimer = setInterval(() => ((nowValue = Date.now()), nowListeners.forEach((l) => l())), 30_000);
  return () => {
    nowListeners.delete(cb);
    if (!nowListeners.size && nowTimer) (clearInterval(nowTimer), (nowTimer = null), (nowListeners = new Set()));
  };
}
const SERVER_NOW = 0;
export function useNow() {
  return useSyncExternalStore(subscribeNow, () => nowValue, () => SERVER_NOW);
}

export function useEngines(): Engines {
  return useView("settings").engines ?? DEFAULT_ENGINES;
}

/** One engine as the browser sees it: whether it's running now, its rules, and the paused message. */
export function useEngine(key: EngineKey) {
  const state = useEngines()[key];
  const now = useNow() || Date.now();
  return { state, params: state.params, running: engineRunning(state, now), message: pausedMessage(key, state, now) };
}

/** Same as useEngine, outside React (event handlers). */
export function getEngine(key: EngineKey) {
  const state = (useDB.getState().settings.engines ?? DEFAULT_ENGINES)[key];
  return { state, params: state.params, running: engineRunning(state), message: pausedMessage(key, state) };
}

/** Cars visible to shoppers. */
export function useLiveCars() {
  const all = useAllCars();
  const suspended = useSuspended();
  return useMemo(() => all.filter((c) => c.status === "active" && !suspended.has(c.sellerId)), [all, suspended]);
}

type PartWithActive = Part & { active: boolean };

function allPartsFrom(s: Pick<DB, "parts" | "partPatch" | "settings">): PartWithActive[] {
  return [...s.parts, ...(stockOn(s.settings) ? PARTS : [])].map((p) => {
    const x = s.partPatch[p.id];
    return { ...p, price: x?.price ?? p.price, stock: x?.stock ?? p.stock, active: x?.active ?? true };
  });
}

export function useAllParts(): PartWithActive[] {
  const parts = useView("parts");
  const partPatch = useView("partPatch");
  const settings = useView("settings");
  return useMemo(() => allPartsFrom({ parts, partPatch, settings }), [parts, partPatch, settings]);
}

export function getPartLive(id: string) {
  return allPartsFrom(useDB.getState()).find((p) => p.id === id);
}

type RentalWithStatus = Rental & { status: FleetStatus };

export function useAllFleet(): RentalWithStatus[] {
  const fleet = useView("fleet");
  const fleetPatch = useView("fleetPatch");
  const settings = useView("settings");
  return useMemo(
    () =>
      [...fleet, ...(stockOn(settings) ? RENTALS : [])].map((r) => {
        const p = fleetPatch[r.id];
        return { ...r, daily: p?.daily ?? r.daily, status: p?.status ?? "available" };
      }),
    [fleet, fleetPatch, settings],
  );
}

/** Overall order status from the customer's point of view (slowest seller wins). */
export function orderStatus(o: Order): OrderStatus {
  const vals = Object.values(o.fulfil);
  if (vals.every((v) => v === "cancelled")) return "cancelled";
  return ORDER_FLOW[Math.min(...vals.map((v) => ORDER_FLOW.indexOf(v)).filter((i) => i >= 0))] ?? "placed";
}

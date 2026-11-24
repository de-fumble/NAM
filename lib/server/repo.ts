import "server-only";
import { BUSINESSES, DEMO_ACCOUNTS, type Business } from "@/lib/data/businesses";
import { CARS, type Car } from "@/lib/data/cars";
import { PARTS, type Part } from "@/lib/data/parts";
import { RENTALS, type Rental } from "@/lib/data/rentals";
import { DEFAULT_SETTINGS, type PlatformSettings } from "@/lib/settings";
import { cleanEngine, cleanEngines, engineRunning, HOLDING, type Engines } from "@/lib/engines";
import { DEMO_CUSTOMERS, isDemoPhone, isStockBusiness } from "@/lib/stock";
import type {
  Booking, CarPatch, FleetPatch, Inspection, Lead, Order, PartPatch, PartRequest, Snapshot, Thread,
} from "@/lib/db";
import { buildSeed } from "@/lib/seed";
import { db } from "./supabase";
import type { UserSession } from "./session";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
const ts = (v: string | null | undefined) => (v ? new Date(v).getTime() : Date.now());
const iso = (n: number) => new Date(n).toISOString();

/* ───────────────────────────── Mappers ───────────────────────────── */

export const bizToRow = (b: Business, owner?: string | null): Row => ({
  id: b.id, name: b.name, type: b.type, tagline: b.tagline, about: b.about, city: b.city, state: b.state, phone: b.phone, rating: b.rating,
  reviews: b.reviews, since: b.since, response_mins: b.responseMins, verified: b.verified, cover: b.cover, hue: b.hue,
  ...(owner !== undefined ? { owner_phone: owner } : {}),
});
export const rowToBiz = (r: Row): Business => ({
  id: r.id, name: r.name, type: r.type, tagline: r.tagline, about: r.about, city: r.city, state: r.state, phone: r.phone, rating: Number(r.rating),
  reviews: r.reviews, since: r.since, responseMins: r.response_mins, verified: r.verified, cover: r.cover, hue: r.hue, status: r.status,
});

export const carToRow = (c: Car, source: "catalog" | "user"): Row => ({
  id: c.id, seller_id: c.sellerId, make: c.make, model: c.model, year: c.year, price: c.price, featured: !!c.featured, source, data: c,
});
export const partToRow = (p: Part, source: "catalog" | "user"): Row => ({
  id: p.id, seller_id: p.sellerId, name: p.name, category: p.category, price: p.price, stock: p.stock, source, data: p,
});
export const vehicleToRow = (v: Rental, source: "catalog" | "user"): Row => ({
  id: v.id, company_id: v.companyId, name: v.name, category: v.category, daily: v.daily, source, data: v,
});

export const leadToRow = (l: Lead): Row => ({
  id: l.id, car_id: l.carId, business_id: l.businessId, customer_name: l.customer.name, customer_phone: l.customer.phone, kind: l.kind,
  amount: l.amount ?? null, note: l.note, stage: l.stage, created_at: iso(l.at),
});
const rowToLead = (r: Row): Lead => ({
  id: r.id, carId: r.car_id, businessId: r.business_id, customer: { name: r.customer_name, phone: r.customer_phone }, kind: r.kind,
  amount: r.amount == null ? undefined : Number(r.amount), note: r.note, stage: r.stage, at: ts(r.created_at),
});

export const threadToRow = (t: Thread): Row => ({
  id: t.id, business_id: t.businessId, customer_name: t.customer.name, customer_phone: t.customer.phone, topic: t.topic,
  unread_biz: t.unreadBiz, unread_cust: t.unreadCust, updated_at: iso(t.at),
});

export const orderToRow = (o: Order): Row => ({
  id: o.id, customer_name: o.customer.name, customer_phone: o.customer.phone, address: o.address, state: o.state, pay: o.pay, lines: o.lines,
  fulfil: o.fulfil, subtotal: o.subtotal, delivery: o.delivery, vat: o.vat, total: o.total, created_at: iso(o.at),
});
const rowToOrder = (r: Row): Order => ({
  id: r.id, customer: { name: r.customer_name, phone: r.customer_phone }, address: r.address, state: r.state, pay: r.pay, lines: r.lines,
  fulfil: r.fulfil, subtotal: Number(r.subtotal), delivery: Number(r.delivery), vat: Number(r.vat), total: Number(r.total), at: ts(r.created_at),
});

export const bookingToRow = (b: Booking): Row => ({
  id: b.id, rental_id: b.rentalId, company_id: b.companyId, vehicle: b.vehicle, customer_name: b.customer.name, customer_phone: b.customer.phone,
  city: b.city, start_date: b.from, end_date: b.to, days: b.days, driver: b.driver, total: b.total, status: b.status, created_at: iso(b.at),
});
const rowToBooking = (r: Row): Booking => ({
  id: r.id, rentalId: r.rental_id, companyId: r.company_id, vehicle: r.vehicle, customer: { name: r.customer_name, phone: r.customer_phone },
  city: r.city, from: r.start_date, to: r.end_date, days: r.days, driver: r.driver, total: Number(r.total), status: r.status, at: ts(r.created_at),
});

export const requestToRow = (q: PartRequest): Row => ({
  id: q.id, customer_name: q.customer.name, customer_phone: q.customer.phone, part: q.part, vehicle: q.vehicle, state: q.state, note: q.note,
  status: q.status, created_at: iso(q.at),
});

export const inspectionToRow = (i: Inspection): Row => ({
  id: i.id, car_id: i.carId, business_id: i.businessId, customer_name: i.customer.name, customer_phone: i.customer.phone, date: i.date,
  slot: i.slot, plan: i.plan, price: i.price, created_at: iso(i.at),
});
const rowToInspection = (r: Row): Inspection => ({
  id: r.id, carId: r.car_id, businessId: r.business_id, customer: { name: r.customer_name, phone: r.customer_phone }, date: r.date,
  slot: r.slot, plan: r.plan, price: Number(r.price), at: ts(r.created_at),
});

/* ───────────────────────────── Reads ───────────────────────────── */

function must<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (res.error) throw Object.assign(new Error(res.error.message), { code: res.error.code });
  return res.data as T;
}

/**
 * Settings are read on every write and snapshot. A short cache keeps that to one query per second
 * under load; admin changes call `invalidateSettings()` so they apply straight away on this server.
 */
let settingsCache: { at: number; value: PlatformSettings } | null = null;
const SETTINGS_TTL = 1000;
export const invalidateSettings = () => void (settingsCache = null);

export async function readSettings(): Promise<PlatformSettings> {
  if (settingsCache && Date.now() - settingsCache.at < SETTINGS_TTL) return settingsCache.value;
  const rows = must(await db().from("settings").select("key, value")) as Row[];
  const get = (k: string) => rows.find((r) => r.key === k)?.value;
  const value: PlatformSettings = {
    feePercent: Number(get("fee_percent") ?? DEFAULT_SETTINGS.feePercent),
    dataMode: get("data_mode") === "live" ? "live" : "stock",
    engines: get("engines") ? cleanEngines(get("engines")) : legacyEngines(get),
  };
  settingsCache = { at: Date.now(), value };
  return value;
}

/** Before engines existed, sign-ups, email verification and the announcement were separate settings. Carry them over. */
function legacyEngines(get: (k: string) => any): Engines {
  const e = cleanEngines(null);
  const ann = get("announcement");
  if (typeof get("signups_open") === "boolean") e.signups.on = get("signups_open");
  if (typeof get("email_verification") === "boolean") e.signups.params.emailVerification = get("email_verification");
  if (ann?.text) e.announcement = cleanEngine("announcement", { on: true, params: { text: ann.text, tone: ann.tone } });
  return e;
}

/** Write the whole engine map (already cleaned). */
export async function writeEngines(engines: Engines) {
  must(await db().from("settings").upsert({ key: "engines", value: engines }, { onConflict: "key" }));
  invalidateSettings();
}

async function threadsWithMessages(rows: Row[]): Promise<Thread[]> {
  if (!rows.length) return [];
  const msgs = must(
    await db().from("messages").select("thread_id, sender, body, created_at").in("thread_id", rows.map((r) => r.id)).eq("hidden", false).order("created_at"),
  ) as Row[];
  return rows.map((r) => ({
    id: r.id, businessId: r.business_id, customer: { name: r.customer_name, phone: r.customer_phone }, topic: r.topic,
    unreadBiz: r.unread_biz, unreadCust: r.unread_cust, at: ts(r.updated_at),
    messages: msgs.filter((m) => m.thread_id === r.id).map((m) => ({ from: m.sender, text: m.body, at: ts(m.created_at) })),
  }));
}

async function requestsWithQuotes(rows: Row[]): Promise<PartRequest[]> {
  if (!rows.length) return [];
  const quotes = must(await db().from("quotes").select("*").in("request_id", rows.map((r) => r.id))) as Row[];
  return rows.map((r) => ({
    id: r.id, customer: { name: r.customer_name, phone: r.customer_phone }, part: r.part, vehicle: r.vehicle, state: r.state, note: r.note,
    status: r.status, at: ts(r.created_at),
    quotes: quotes.filter((q) => q.request_id === r.id).map((q) => ({ businessId: q.business_id, price: Number(q.price), note: q.note, at: ts(q.created_at) })),
  }));
}

/* ───────────────────────────── Live mode ───────────────────────────── */

/** Activity that belongs to the sample data: a demo shopper, or a stock business on the other side. */
export const isStockActivity = (r: Row) => isDemoPhone(r.customer_phone) || isStockBusiness(r.business_id ?? r.company_id);
export const isStockOrder = (r: Row) => isDemoPhone(r.customer_phone) || Object.keys(r.fulfil ?? {}).every(isStockBusiness);
/** A session that belongs to the sample data (a demo account) — refused while the platform is live. */
export const isDemoSession = (s: Pick<UserSession, "phone" | "businessId"> | null) => !!s && (isDemoPhone(s.phone) || isStockBusiness(s.businessId));

/** Strip every stock record from a snapshot. */
function liveOnly(out: Snapshot): Snapshot {
  const keep = <T extends { customer: { phone: string } }>(rows: T[], biz: (r: T) => string) => rows.filter((r) => !isDemoPhone(r.customer.phone) && !isStockBusiness(biz(r)));
  const userCars = new Set(out.listings.map((c) => c.id));
  const userParts = new Set(out.parts.map((p) => p.id));
  const userFleet = new Set(out.fleet.map((v) => v.id));
  const pick = <T,>(m: Record<string, T>, ids: Set<string>) => Object.fromEntries(Object.entries(m).filter(([k]) => ids.has(k)));
  return {
    ...out,
    businesses: out.businesses.filter((b) => !isStockBusiness(b.id)),
    carPatch: pick(out.carPatch, userCars),
    partPatch: pick(out.partPatch, userParts),
    fleetPatch: pick(out.fleetPatch, userFleet),
    leads: keep(out.leads, (r) => r.businessId),
    threads: keep(out.threads, (r) => r.businessId),
    orders: out.orders.filter((o) => !isDemoPhone(o.customer.phone) && !Object.keys(o.fulfil).every(isStockBusiness)),
    bookings: keep(out.bookings, (r) => r.companyId),
    requests: out.requests.filter((r) => !isDemoPhone(r.customer.phone)).map((r) => ({ ...r, quotes: r.quotes.filter((q) => !isStockBusiness(q.businessId)) })),
    inspections: keep(out.inspections, (r) => r.businessId),
  };
}

/** Public catalogue state + the caller's own activity. Scoped strictly by the session. */
export async function snapshot(session: UserSession | null): Promise<Snapshot> {
  const out = await rawSnapshot(session);
  const live = out.settings.dataMode === "live";
  // Demo accounts are switched off on live data, or by the Demo accounts engine: the client signs them out.
  if (isDemoSession(session) && (live || !engineRunning(out.settings.engines.demo))) {
    const bare = { ...out, leads: [], threads: [], orders: [], bookings: [], requests: [], inspections: [] };
    return { ...(live ? liveOnly(bare) : bare), me: { status: "demo_off" } };
  }
  return live ? liveOnly(out) : out;
}

async function rawSnapshot(session: UserSession | null): Promise<Snapshot> {
  const s = db();
  const today = new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 10);
  const [settings, bizRows, carRows, partRows, vehRows, held, me] = await Promise.all([
    readSettings(),
    s.from("businesses").select("*").then(must),
    s.from("cars").select("id, price, status, featured, source, data, created_at").then(must),
    s.from("parts").select("id, price, stock, active, source, data").then(must),
    s.from("vehicles").select("id, daily, status, source, data").then(must),
    // Dates each car is already held for — no renter details, just the ranges, so search can hide booked cars.
    s.from("bookings").select("rental_id, start_date, end_date").in("status", [...HOLDING]).gt("end_date", today).then(must),
    session ? s.from("profiles").select("status").eq("phone", session.phone).maybeSingle().then(must) : Promise.resolve(null),
  ]);

  const carPatch: Record<string, CarPatch> = {};
  for (const r of carRows as Row[]) carPatch[r.id] = { price: Number(r.price), status: r.status, featured: r.featured };
  const partPatch: Record<string, PartPatch> = {};
  for (const r of partRows as Row[]) partPatch[r.id] = { price: Number(r.price), stock: r.stock, active: r.active };
  const fleetPatch: Record<string, FleetPatch> = {};
  for (const r of vehRows as Row[]) fleetPatch[r.id] = { daily: Number(r.daily), status: r.status };
  const fleetBusy: Record<string, [string, string][]> = {};
  for (const r of held as Row[]) (fleetBusy[r.rental_id] ??= []).push([r.start_date, r.end_date]);

  const out: Snapshot = {
    me: me ? { status: (me as Row).status } : null,
    settings,
    businesses: (bizRows as Row[]).map(rowToBiz),
    listings: (carRows as Row[]).filter((r) => r.source === "user").map((r) => ({ ...(r.data as Car), createdAt: ts(r.created_at) })),
    carPatch,
    parts: (partRows as Row[]).filter((r) => r.source === "user").map((r) => r.data as Part),
    partPatch,
    fleet: (vehRows as Row[]).filter((r) => r.source === "user").map((r) => r.data as Rental),
    fleetPatch,
    fleetBusy,
    leads: [], threads: [], orders: [], bookings: [], requests: [], inspections: [],
  };
  if (!session) return out;

  const phone = session.phone;
  const biz = session.role !== "customer" ? session.businessId : undefined;
  const byCustomer = (t: string) => s.from(t).select("*").eq("customer_phone", phone);

  if (!biz) {
    const [leads, threads, orders, bookings, requests, inspections] = await Promise.all([
      byCustomer("leads").order("created_at", { ascending: false }).then(must),
      byCustomer("threads").order("updated_at", { ascending: false }).then(must),
      byCustomer("orders").order("created_at", { ascending: false }).then(must),
      byCustomer("bookings").then(must),
      byCustomer("part_requests").order("created_at", { ascending: false }).then(must),
      byCustomer("inspections").then(must),
    ]);
    out.leads = (leads as Row[]).map(rowToLead);
    out.threads = await threadsWithMessages(threads as Row[]);
    out.orders = (orders as Row[]).map(rowToOrder);
    out.bookings = (bookings as Row[]).map(rowToBooking);
    out.requests = await requestsWithQuotes(requests as Row[]);
    out.inspections = (inspections as Row[]).map(rowToInspection);
    return out;
  }

  const [leads, threads, orders, bookings, openReqs, quoted, inspections] = await Promise.all([
    s.from("leads").select("*").eq("business_id", biz).order("created_at", { ascending: false }).then(must),
    s.from("threads").select("*").or(`business_id.eq.${biz},customer_phone.eq.${phone}`).order("updated_at", { ascending: false }).then(must),
    // Small volumes: filter the jsonb fulfil map in code. Swap for an RPC when order volume grows.
    s.from("orders").select("*").order("created_at", { ascending: false }).limit(1000).then(must),
    s.from("bookings").select("*").eq("company_id", biz).then(must),
    session.role === "parts" ? s.from("part_requests").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(200).then(must) : Promise.resolve([]),
    session.role === "parts" ? s.from("quotes").select("request_id").eq("business_id", biz).then(must) : Promise.resolve([]),
    s.from("inspections").select("*").eq("business_id", biz).then(must),
  ]);
  const quotedIds = (quoted as Row[]).map((q) => q.request_id).filter((id) => !(openReqs as Row[]).some((r) => r.id === id));
  const quotedReqs = quotedIds.length ? (must(await s.from("part_requests").select("*").in("id", quotedIds)) as Row[]) : [];

  out.leads = (leads as Row[]).map(rowToLead);
  out.threads = await threadsWithMessages(threads as Row[]);
  out.orders = (orders as Row[]).filter((o) => o.fulfil && biz in o.fulfil).map(rowToOrder);
  out.bookings = (bookings as Row[]).map(rowToBooking);
  out.requests = await requestsWithQuotes([...(openReqs as Row[]), ...quotedReqs]);
  out.inspections = (inspections as Row[]).map(rowToInspection);
  return out;
}

/* ───────────────────────────── Seed ───────────────────────────── */

/** Loads the catalogue and demo activity. Idempotent: never overwrites rows that already exist. */
export async function seedDatabase() {
  const s = db();
  const up = async (table: string, rows: Row[], onConflict = "id") => {
    for (let i = 0; i < rows.length; i += 500) must(await s.from(table).upsert(rows.slice(i, i + 500), { onConflict, ignoreDuplicates: true }));
  };
  const owners = new Map(DEMO_ACCOUNTS.filter((d) => d.businessId).map((d) => [d.businessId!, d.phone]));

  await up("businesses", BUSINESSES.map((b) => bizToRow(b, owners.get(b.id) ?? null)));
  await up("cars", CARS.map((c) => carToRow(c, "catalog")));
  await up("parts", PARTS.map((p) => partToRow(p, "catalog")));
  await up("vehicles", RENTALS.map((r) => vehicleToRow(r, "catalog")));
  await up(
    "profiles",
    [
      ...DEMO_CUSTOMERS.map(([name, phone]) => ({ phone, name, role: "customer" })),
      ...DEMO_ACCOUNTS.filter((d) => d.businessId).map((d) => ({ phone: d.phone, name: d.name, role: d.role, business_id: d.businessId })),
    ],
    "phone",
  );

  // Demo activity only goes in once, on an empty marketplace.
  const { count } = await s.from("threads").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return { activity: false };
  const seed = buildSeed(Date.now());
  await up("leads", seed.leads.map(leadToRow));
  await up("threads", seed.threads.map(threadToRow));
  must(await s.from("messages").insert(seed.threads.flatMap((t) => t.messages.map((m) => ({ thread_id: t.id, sender: m.from, body: m.text, created_at: iso(m.at) })))));
  await up("orders", seed.orders.map(orderToRow));
  await up("bookings", seed.bookings.map(bookingToRow));
  await up("part_requests", seed.requests.map(requestToRow));
  await up("quotes", seed.requests.flatMap((r) => r.quotes.map((q) => ({ request_id: r.id, business_id: q.businessId, price: q.price, note: q.note, created_at: iso(q.at) }))), "request_id,business_id");
  await up("inspections", seed.inspections.map(inspectionToRow));
  must(await s.from("audit_log").insert({ actor: "system", action: "seed", entity: "database", detail: { cars: CARS.length, parts: PARTS.length } }));
  return { activity: true };
}

export async function audit(actor: string, action: string, entity: string, entityId?: string | null, detail: Row = {}) {
  await db().from("audit_log").insert({ actor, action, entity, entity_id: entityId ?? null, detail });
}

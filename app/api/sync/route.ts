import { NextResponse } from "next/server";
import type { Business } from "@/lib/data/businesses";
import type { Car } from "@/lib/data/cars";
import type { Part } from "@/lib/data/parts";
import type { Rental } from "@/lib/data/rentals";
import type { Booking, Inspection, Lead, Order, PartRequest, Thread } from "@/lib/db";
import {
  audit, bookingToRow, carToRow, inspectionToRow, isDemoSession, leadToRow, orderToRow, partToRow, readSettings, requestToRow, snapshot, vehicleToRow,
} from "@/lib/server/repo";
import { isStockBusiness } from "@/lib/stock";
import { engineRunning, HOLDING, inspectionPrice, overlaps, partsTotals, rentalQuote } from "@/lib/engines";
import type { PlatformSettings } from "@/lib/settings";
import { EngineOff, inMaintenance, maintenanceMessage, requireEngine } from "@/lib/server/engines";
import { decodeVin } from "@/lib/server/vin";
import { cleanVin, isVin, vinMatches } from "@/lib/vin";
import { getUserSession, type UserSession } from "@/lib/server/session";
import { db, isMissingTable, supabaseConfigured } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = Record<string, any>;
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
const deny = (msg = "Not allowed") => new HttpError(403, msg);
const bad = (msg = "Invalid request") => new HttpError(400, msg);
const ORDER_FLOW = ["placed", "packed", "shipped", "delivered"] as const;
const LEAD_STAGES = ["new", "contacted", "viewing", "negotiating", "won", "lost"];
const str = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : NaN);

/* ───────────────────────────── GET: snapshot ───────────────────────────── */

export async function GET() {
  if (!supabaseConfigured) return NextResponse.json({ error: "not configured" }, { status: 503 });
  try {
    const session = await getUserSession();
    const snap = await snapshot(session);
    if (session) await db().from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("phone", session.phone);
    return NextResponse.json(snap, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (isMissingTable(e as Any)) return NextResponse.json({ error: "migration not applied" }, { status: 503 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/* ───────────────────────────── POST: one write ───────────────────────────── */

export async function POST(req: Request) {
  if (!supabaseConfigured) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const session = await getUserSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { op?: string; payload?: Any } | null;
  if (!body?.op || typeof body.payload !== "object" || !body.payload) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const s = db();
    const profile = await s.from("profiles").select("status").eq("phone", session.phone).maybeSingle();
    if (profile.data?.status === "suspended") throw deny("Your account has been suspended.");
    if (session.businessId) {
      const biz = await s.from("businesses").select("status").eq("id", session.businessId).maybeSingle();
      if (biz.data?.status === "suspended" && !["thread.read"].includes(body.op)) throw deny("Your business has been suspended.");
    }
    const settings = await readSettings();
    if (inMaintenance(settings) && body.op !== "thread.read") return NextResponse.json({ error: maintenanceMessage(settings), code: "MAINTENANCE" }, { status: 503 });
    if (isDemoSession(session) && (settings.dataMode === "live" || !engineRunning(settings.engines.demo)))
      throw new HttpError(401, settings.dataMode === "live" ? "Demo accounts are switched off — the marketplace is on live data." : "Demo accounts are switched off.");
    await run(session, body.op, body.payload, settings);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EngineOff) return NextResponse.json({ error: e.message, code: e.code, engine: e.engine }, { status: e.status });
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (isMissingTable(e as Any)) return NextResponse.json({ error: "migration not applied" }, { status: 503 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

function check(res: { error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message);
}

const sellerIds = (s: UserSession) => [s.businessId, `u:${s.phone}`].filter(Boolean) as string[];
const isMe = (s: UserSession, phone: unknown) => typeof phone === "string" && phone === s.phone;
const actor = (s: UserSession) => `user:${s.phone}`;

async function ownedRow(table: string, id: string, ownerCol: string, owners: string[]) {
  const { data } = await db().from(table).select(`id, ${ownerCol}, status`).eq("id", id).maybeSingle();
  if (!data) throw bad("Not found");
  const row = data as unknown as Any;
  if (!owners.includes(row[ownerCol])) throw deny();
  return row;
}

/** Upload base64 photos to Storage so listings don't carry megabytes of data URLs. */
async function storePhotos(carId: string, photos: unknown): Promise<string[]> {
  if (!Array.isArray(photos)) return [];
  const out: string[] = [];
  for (const [i, p] of photos.slice(0, 8).entries()) {
    if (typeof p !== "string") continue;
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(p);
    if (!m) {
      if (/^https?:\/\//.test(p)) out.push(p);
      continue;
    }
    const path = `cars/${carId}/${i}-${Date.now().toString(36)}.${m[1].split("/")[1]}`;
    const { error } = await db().storage.from("listing-photos").upload(path, Buffer.from(m[2], "base64"), { contentType: m[1], upsert: true });
    if (error) throw new Error(`Photo upload failed: ${error.message}`);
    out.push(db().storage.from("listing-photos").getPublicUrl(path).data.publicUrl);
  }
  return out;
}

const GONE = "This listing isn't available any more.";

/** Lagos calendar date (YYYY-MM-DD) for "today", so bookings can't start in the past. */
const lagosToday = () => new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 10);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * One marketplace write. Every op that starts something new checks its engine first (see lib/engines.ts);
 * ops that finish existing work (shipping an order, completing a trip) keep working while an engine is paused.
 * On live data, sample (catalog) listings and stock businesses can't be transacted with.
 */
async function run(se: UserSession, op: string, p: Any, settings: PlatformSettings) {
  const s = db();
  const live = settings.dataMode === "live";
  const need = (k: Parameters<typeof requireEngine>[1]) => requireEngine(settings, k);
  switch (op) {
    /* Businesses */
    case "business.update": {
      if (!se.businessId || p.id !== se.businessId) throw deny();
      const patch = p.patch as Partial<Business>;
      const allowed: Any = {};
      for (const k of ["name", "tagline", "about", "city", "state", "phone"] as const) if (typeof patch?.[k] === "string") allowed[k] = str(patch[k], 2000);
      if (typeof patch?.responseMins === "number") allowed.response_mins = num(patch.responseMins);
      // `verified` is NOT self-service: the dashboard request is logged for admin review instead.
      if (patch?.verified) await audit(actor(se), "verification.requested", "businesses", se.businessId);
      if (Object.keys(allowed).length) check(await s.from("businesses").update(allowed).eq("id", se.businessId));
      return;
    }

    /* Cars */
    case "car.create": {
      const rules = need("listings");
      const c = p as Car;
      if (!str(c.id, 120) || !sellerIds(se).includes(c.sellerId)) throw deny();
      if (!(num(c.price) > 0)) throw bad("Invalid price");
      const vin = cleanVin(str(c.vin, 40));
      if (rules.requireVin && !isVin(vin)) throw bad("Add the car's 17-character VIN to list it.");
      const limit = Number(rules.privateLimit);
      if (limit > 0 && c.sellerId.startsWith("u:")) {
        const { count } = await s.from("cars").select("id", { count: "exact", head: true }).eq("seller_id", c.sellerId).eq("status", "active");
        if ((count ?? 0) >= limit) throw bad(`Private sellers can have ${limit} active ${limit === 1 ? "listing" : "listings"} at a time. Mark one as sold or pause it first.`);
      }
      const photos = await storePhotos(c.id, Array.isArray(c.photos) ? c.photos.slice(0, Number(rules.maxPhotos)) : []);
      // The VIN badge is decided here, never by the client: decode it and compare with the listing.
      let vinMatch = false;
      if (isVin(vin) && engineRunning(settings.engines.vin)) {
        const r = await decodeVin(vin);
        vinMatch = r.ok && vinMatches(r.report, str(c.make, 60), num(c.year));
      }
      const car: Car = { ...c, vin: isVin(vin) ? vin : undefined, vinMatch, photos, img: photos[0] ?? c.img, verified: false, inspected: false, featured: false, views: 0 };
      check(await s.from("cars").insert(carToRow(car, "user")));
      await audit(actor(se), "car.create", "cars", c.id, { title: `${c.year} ${c.make} ${c.model}`, price: c.price });
      return;
    }
    case "car.patch": {
      const row = await ownedRow("cars", str(p.id), "seller_id", sellerIds(se));
      if (row.status === "removed") throw deny("This listing was removed by an admin.");
      const patch: Any = {};
      if (p.price !== undefined) patch.price = num(p.price);
      if (p.status !== undefined) {
        if (!["active", "paused", "sold"].includes(p.status)) throw bad();
        patch.status = p.status;
      }
      if (Number.isNaN(patch.price)) throw bad("Invalid price");
      check(await s.from("cars").update(patch).eq("id", row.id));
      return;
    }

    /* Parts */
    case "part.create": {
      const part = p as Part;
      if (se.role !== "parts" || part.sellerId !== se.businessId || !str(part.id, 120)) throw deny();
      check(await s.from("parts").insert(partToRow({ ...part, rating: 5, reviews: 0 }, "user")));
      await audit(actor(se), "part.create", "parts", part.id, { name: part.name });
      return;
    }
    case "part.patch": {
      const row = await ownedRow("parts", str(p.id), "seller_id", sellerIds(se));
      const patch: Any = {};
      if (p.price !== undefined) patch.price = num(p.price);
      if (p.stock !== undefined) patch.stock = num(p.stock);
      if (typeof p.active === "boolean") patch.active = p.active;
      if (Object.values(patch).some((v) => Number.isNaN(v))) throw bad();
      check(await s.from("parts").update(patch).eq("id", row.id));
      return;
    }

    /* Fleet */
    case "vehicle.create": {
      const v = p as Rental;
      if (se.role !== "rental" || v.companyId !== se.businessId || !str(v.id, 120)) throw deny();
      check(await s.from("vehicles").insert(vehicleToRow({ ...v, rating: 5, trips: 0 }, "user")));
      await audit(actor(se), "vehicle.create", "vehicles", v.id, { name: v.name });
      return;
    }
    case "vehicle.patch": {
      const row = await ownedRow("vehicles", str(p.id), "company_id", sellerIds(se));
      if (row.status === "removed") throw deny("This vehicle was removed by an admin.");
      const patch: Any = {};
      if (p.daily !== undefined) patch.daily = num(p.daily);
      if (p.status !== undefined) {
        if (!["available", "maintenance"].includes(p.status)) throw bad();
        patch.status = p.status;
      }
      if (Number.isNaN(patch.daily)) throw bad();
      check(await s.from("vehicles").update(patch).eq("id", row.id));
      return;
    }

    /* Leads */
    case "lead.create": {
      const l = p as Lead;
      if (!isMe(se, l.customer?.phone)) throw deny();
      if (!["message", "offer", "inspection", "call"].includes(l.kind)) throw bad();
      const rules = l.kind === "offer" ? need("offers") : l.kind === "inspection" ? need("inspections") : l.kind === "message" ? need("messaging") : {};
      const car = await s.from("cars").select("seller_id, source, price, status").eq("id", l.carId).maybeSingle();
      if (!car.data) throw bad("Unknown car");
      if ((live && car.data.source === "catalog") || car.data.status !== "active") throw bad(GONE);
      let amount: number | undefined;
      if (l.kind === "offer") {
        amount = num(l.amount);
        // The offer slider rounds to ₦50,000, so the floor does too.
        const floor = Math.floor((Number(car.data.price) * Number(rules.minPercent)) / 100 / 50_000) * 50_000;
        if (!(amount > 0) || amount < floor || amount > Number(car.data.price)) throw bad(`Offers must be between ${rules.minPercent}% and 100% of the asking price.`);
      }
      check(await s.from("leads").insert(leadToRow({ ...l, amount, note: str(l.note, 500), businessId: car.data.seller_id, stage: "new", at: Date.now() })));
      return;
    }
    case "lead.stage": {
      if (!LEAD_STAGES.includes(p.stage)) throw bad();
      const { data } = await s.from("leads").select("business_id").eq("id", str(p.id)).maybeSingle();
      if (!data || data.business_id !== se.businessId) throw deny();
      check(await s.from("leads").update({ stage: p.stage }).eq("id", p.id));
      return;
    }

    /* Messaging */
    case "message.send": {
      const rules = need("messaging");
      const t = p.thread as Pick<Thread, "id" | "businessId" | "customer" | "topic">;
      const from = p.from as "customer" | "business";
      const text = str(p.text, Number(rules.maxLength)).trim();
      if (!text || !t?.id || !["customer", "business"].includes(from)) throw bad();
      const { data: existing } = await s.from("threads").select("*").eq("id", t.id).maybeSingle();
      const businessId = existing?.business_id ?? t.businessId;
      const customerPhone = existing?.customer_phone ?? t.customer?.phone;
      if (from === "customer" && customerPhone !== se.phone) throw deny();
      if (from === "business" && businessId !== se.businessId) throw deny();
      const now = new Date().toISOString();
      if (live && isStockBusiness(businessId)) throw bad(GONE);
      if (!existing) {
        if (from === "customer" && !isMe(se, t.customer?.phone)) throw deny();
        check(await s.from("threads").insert({
          id: str(t.id, 120), business_id: businessId, customer_name: str(t.customer?.name, 80), customer_phone: customerPhone, topic: t.topic,
          unread_biz: from === "customer" ? 1 : 0, unread_cust: from === "business" ? 1 : 0, updated_at: now,
        }));
      } else {
        check(await s.from("threads").update({
          updated_at: now,
          unread_biz: existing.unread_biz + (from === "customer" ? 1 : 0),
          unread_cust: existing.unread_cust + (from === "business" ? 1 : 0),
        }).eq("id", existing.id));
      }
      check(await s.from("messages").insert({ thread_id: t.id, sender: from, body: text }));
      return;
    }
    case "thread.read": {
      const { data } = await s.from("threads").select("business_id, customer_phone").eq("id", str(p.id)).maybeSingle();
      if (!data) return;
      if (p.side === "biz" && data.business_id === se.businessId) check(await s.from("threads").update({ unread_biz: 0 }).eq("id", p.id));
      else if (p.side === "cust" && data.customer_phone === se.phone) check(await s.from("threads").update({ unread_cust: 0 }).eq("id", p.id));
      return;
    }

    /* Orders — prices and totals are recomputed from the database, never trusted from the client. */
    case "order.create": {
      const rules = need("parts");
      const o = p as Order;
      if (!isMe(se, o.customer?.phone) || !Array.isArray(o.lines) || !o.lines.length || o.lines.length > 50) throw deny();
      const ids = o.lines.map((l) => str(l.partId, 120));
      const { data: parts } = await s.from("parts").select("id, name, price, stock, active, seller_id, source").in("id", ids);
      const lines = o.lines.map((l) => {
        const part = parts?.find((x) => x.id === l.partId);
        const qty = Math.min(Number(rules.maxQty), Math.max(1, num(l.qty) || 1));
        if (!part || !part.active || (live && part.source === "catalog")) throw bad(`${l.name ?? "An item"} is no longer available.`);
        if (part.stock < qty) throw bad(`Only ${part.stock} left of ${part.name}.`);
        return { partId: part.id, name: part.name, qty, price: Number(part.price), sellerId: part.seller_id };
      });
      const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
      const state = str(o.state, 40);
      const { delivery, vat } = partsTotals(subtotal, state, rules);
      const fulfil = Object.fromEntries(Array.from(new Set(lines.map((l) => l.sellerId))).map((x) => [x, "placed"]));
      check(await s.from("orders").insert(orderToRow({
        ...o, customer: { name: str(o.customer.name, 80), phone: se.phone }, address: str(o.address, 300), state, pay: str(o.pay, 20),
        lines, subtotal, delivery, vat, total: subtotal + delivery + vat, fulfil, at: Date.now(),
      })));
      for (const l of lines) check(await s.rpc("decrement_stock", { p_part: l.partId, p_qty: l.qty }));
      await audit(actor(se), "order.create", "orders", o.id, { total: subtotal + delivery + vat, sellers: Object.keys(fulfil) });
      return;
    }
    case "order.advance": {
      if (!se.businessId || p.sellerId !== se.businessId) throw deny();
      const { data } = await s.from("orders").select("fulfil").eq("id", str(p.orderId)).maybeSingle();
      const cur = data?.fulfil?.[se.businessId];
      const i = ORDER_FLOW.indexOf(cur);
      if (i < 0 || i >= ORDER_FLOW.length - 1) throw bad("Order can't move forward.");
      check(await s.from("orders").update({ fulfil: { ...data!.fulfil, [se.businessId]: ORDER_FLOW[i + 1] } }).eq("id", p.orderId));
      return;
    }

    /* Rentals — total recomputed from the vehicle's current rate. */
    case "booking.create": {
      const rules = need("rentals");
      const b = p as Booking;
      if (!isMe(se, b.customer?.phone) || !str(b.id, 40)) throw deny();
      const from = str(b.from, 10);
      const to = str(b.to, 10);
      if (!DAY_RE.test(from) || !DAY_RE.test(to) || to <= from) throw bad("Choose a return date after the pick-up date.");
      if (from < lagosToday()) throw bad("Pick-up can't be in the past.");
      // Days come from the dates, never from the client.
      const days = Math.round((Date.parse(to) - Date.parse(from)) / 864e5);
      if (days > Number(rules.maxDays)) throw bad(`Bookings can be up to ${rules.maxDays} days.`);
      const { data: v } = await s.from("vehicles").select("id, name, daily, status, company_id, source, data").eq("id", str(b.rentalId)).maybeSingle();
      if (!v || v.status !== "available" || (live && v.source === "catalog")) throw bad("This vehicle isn't available.");
      const driver = !!b.driver;
      if (driver ? v.data?.withDriver === false : v.data?.selfDrive === false) throw bad(driver ? "This car is self-drive only." : "This car is only available with a chauffeur.");
      if (rules.preventOverlap) {
        const { data: held } = await s.from("bookings").select("start_date, end_date").eq("rental_id", v.id).in("status", [...HOLDING]).gt("end_date", from);
        if ((held ?? []).some((h) => overlaps(from, to, h.start_date, h.end_date))) throw bad("This car is already booked for some of those dates. Try other dates or another car.");
      }
      const q = rentalQuote(Number(v.daily), days, driver, !!v.data?.selfDrive, rules);
      const status = rules.autoConfirm ? "confirmed" : "pending";
      check(await s.from("bookings").insert(bookingToRow({
        ...b, from, to, driver, city: str(b.city, 40), companyId: v.company_id, vehicle: v.name, customer: { name: str(b.customer.name, 80), phone: se.phone },
        days, total: q.total, status, at: Date.now(),
      })));
      await audit(actor(se), "booking.create", "bookings", b.id, { vehicle: v.name, company: v.company_id, status });
      return;
    }
    case "booking.status": {
      const { data } = await s.from("bookings").select("company_id, customer_phone, status, start_date").eq("id", str(p.id)).maybeSingle();
      if (!data) throw bad("Not found");
      const next = p.status as string;
      const asCompany = data.company_id === se.businessId;
      const asCustomer = data.customer_phone === se.phone;
      const companyMoves: Record<string, string[]> = { pending: ["confirmed", "declined"], confirmed: ["active", "cancelled"], active: ["completed"] };
      const customerMoves: Record<string, string[]> = { pending: ["cancelled"], confirmed: ["cancelled"] };
      const ok = (asCompany && companyMoves[data.status]?.includes(next)) || (asCustomer && customerMoves[data.status]?.includes(next));
      if (!ok) throw bad("That status change isn't allowed.");
      // Renters can cancel a confirmed booking only up to the cut-off before pickup (Lagos midnight on the pick-up day).
      if (asCustomer && !asCompany && data.status === "confirmed") {
        const hours = Number(settings.engines.rentals.params.cancelHours);
        if (Date.parse(`${data.start_date}T00:00:00+01:00`) - Date.now() < hours * 3600_000)
          throw bad(`Confirmed bookings can be cancelled up to ${hours} hours before pickup. Contact the rental company.`);
      }
      check(await s.from("bookings").update({ status: next }).eq("id", p.id));
      return;
    }

    /* Part requests */
    case "request.create": {
      const rules = need("partRequests");
      const r = p as PartRequest;
      if (!isMe(se, r.customer?.phone) || !str(r.part).trim()) throw deny();
      if (Number(rules.maxOpen) > 0) {
        const { count } = await s.from("part_requests").select("id", { count: "exact", head: true }).eq("customer_phone", se.phone).eq("status", "open");
        if ((count ?? 0) >= Number(rules.maxOpen)) throw bad(`You can have ${rules.maxOpen} open requests at a time. Close one you no longer need first.`);
      }
      check(await s.from("part_requests").insert(requestToRow({
        ...r, part: str(r.part, 200), vehicle: str(r.vehicle, 120), note: str(r.note, 1000), status: "open", quotes: [], at: Date.now(),
      })));
      return;
    }
    case "request.quote": {
      need("partRequests");
      if (se.role !== "parts" || p.businessId !== se.businessId || !(num(p.price) > 0)) throw deny();
      const { data } = await s.from("part_requests").select("status").eq("id", str(p.requestId)).maybeSingle();
      if (data?.status !== "open") throw bad("This request is closed.");
      check(await s.from("quotes").upsert({ request_id: p.requestId, business_id: se.businessId, price: num(p.price), note: str(p.note, 500) }, { onConflict: "request_id,business_id" }));
      return;
    }
    case "request.close": {
      const { data } = await s.from("part_requests").select("customer_phone").eq("id", str(p.id)).maybeSingle();
      if (!data || data.customer_phone !== se.phone) throw deny();
      check(await s.from("part_requests").update({ status: "closed" }).eq("id", p.id));
      return;
    }

    /* Inspections */
    case "inspection.create": {
      const rules = need("inspections");
      const i = p as Inspection;
      if (!isMe(se, i.customer?.phone)) throw deny();
      if (live && isStockBusiness(i.businessId)) throw bad(GONE);
      const plan = i.plan === "Essential" ? "Essential" : "Complete";
      check(await s.from("inspections").insert(inspectionToRow({ ...i, plan, price: inspectionPrice(plan, rules), at: Date.now() })));
      return;
    }

    default:
      throw bad(`Unknown operation: ${op}`);
  }
}


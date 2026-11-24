import { NextResponse } from "next/server";
import { audit, invalidateSettings, isStockActivity, isStockOrder, readSettings, seedDatabase, writeEngines } from "@/lib/server/repo";
import { cleanEngine, ENGINE_BY_KEY, type EngineKey } from "@/lib/engines";
import { DEMO_PHONES, STOCK_BUSINESS_IDS, isDemoPhone, isStockBusiness } from "@/lib/stock";
import { getAdminSession, type AdminSession } from "@/lib/server/session";
import { db, isMissingColumn, isMissingTable, supabaseConfigured } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = Record<string, any>;
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Field = "bool" | "int" | string[];
interface Entity {
  table: string;
  pk: string;
  select?: string;
  search: string[];
  order: string;
  filters?: Record<string, Field>;
  edit?: Record<string, Field>;
  deletable?: boolean;
  /** How to drop sample (stock) rows when the platform is on live data. */
  live?: (q: any) => any;
}

/** PostgREST `in` list, quoted so phone numbers with spaces and `+` survive. */
const inList = (vals: Iterable<string>) => `(${Array.from(vals, (v) => `"${v.replace(/"/g, "")}"`).join(",")})`;
const STOCK_BIZ = inList(STOCK_BUSINESS_IDS);
const DEMO = inList(DEMO_PHONES);
const notStockBiz = (col: string) => (q: any) => q.not(col, "in", STOCK_BIZ);
const notDemo = (q: any) => q.not("customer_phone", "in", DEMO);
const userSource = (q: any) => q.eq("source", "user");

/** Everything the admin can see and change. Anything not listed here is rejected. */
const ENTITIES: Record<string, Entity> = {
  users: {
    table: "profiles", pk: "phone", search: ["name", "phone", "email"], order: "created_at",
    filters: { role: ["customer", "dealer", "rental", "parts"], status: ["active", "suspended"] },
    edit: { status: ["active", "suspended"], role: ["customer", "dealer", "rental", "parts"] },
    live: (q) => q.not("phone", "in", DEMO),
  },
  businesses: {
    table: "businesses", pk: "id", search: ["name", "id", "city", "phone"], order: "created_at",
    filters: { type: ["dealer", "rental", "parts"], status: ["active", "suspended"], verified: "bool" },
    edit: { verified: "bool", status: ["active", "suspended"] },
    live: notStockBiz("id"),
  },
  cars: {
    table: "cars", pk: "id", select: "id, seller_id, make, model, year, price, status, featured, source, created_at, img:data->>img, city:data->>city, condition:data->>condition, vin:data->>vin, vin_match:data->>vinMatch",
    search: ["make", "model", "id", "seller_id"], order: "created_at",
    filters: { status: ["active", "paused", "sold", "removed"], source: ["catalog", "user"], featured: "bool" },
    edit: { status: ["active", "paused", "sold", "removed"], featured: "bool", price: "int" },
    live: userSource,
  },
  parts: {
    table: "parts", pk: "id", select: "id, seller_id, name, category, price, stock, active, source, created_at, brand:data->>brand",
    search: ["name", "seller_id", "category"], order: "created_at",
    filters: { active: "bool", source: ["catalog", "user"] },
    edit: { active: "bool", price: "int", stock: "int" },
    live: userSource,
  },
  vehicles: {
    table: "vehicles", pk: "id", select: "id, company_id, name, category, daily, status, source, created_at, img:data->>img",
    search: ["name", "company_id"], order: "created_at",
    filters: { status: ["available", "maintenance", "removed"] },
    edit: { status: ["available", "maintenance", "removed"], daily: "int" },
    live: userSource,
  },
  orders: {
    table: "orders", pk: "id", search: ["id", "customer_name", "customer_phone"], order: "created_at",
    filters: { refunded: "bool" },
    live: notDemo,
  },
  bookings: {
    table: "bookings", pk: "id", search: ["id", "vehicle", "customer_name", "company_id"], order: "created_at",
    filters: { status: ["pending", "confirmed", "active", "completed", "declined", "cancelled"] },
    edit: { status: ["pending", "confirmed", "active", "completed", "declined", "cancelled"] },
    live: (q) => notDemo(notStockBiz("company_id")(q)),
  },
  leads: {
    table: "leads", pk: "id", search: ["customer_name", "business_id", "car_id"], order: "created_at",
    filters: { stage: ["new", "contacted", "viewing", "negotiating", "won", "lost"], kind: ["message", "offer", "inspection", "call"] },
    edit: { stage: ["new", "contacted", "viewing", "negotiating", "won", "lost"] },
    live: (q) => notDemo(notStockBiz("business_id")(q)),
  },
  threads: { table: "threads", pk: "id", search: ["customer_name", "business_id"], order: "updated_at", deletable: true, live: (q) => notDemo(notStockBiz("business_id")(q)) },
  requests: {
    table: "part_requests", pk: "id", search: ["part", "vehicle", "customer_name"], order: "created_at",
    filters: { status: ["open", "closed"] }, edit: { status: ["open", "closed"] }, deletable: true, live: notDemo,
  },
  inspections: { table: "inspections", pk: "id", search: ["car_id", "customer_name", "business_id"], order: "created_at", live: (q) => notDemo(notStockBiz("business_id")(q)) },
  audit: { table: "audit_log", pk: "id", search: ["actor", "action", "entity", "entity_id"], order: "created_at" },
};

const clean = (q: string) => q.replace(/[%,()*\\]/g, " ").trim().slice(0, 80);

function coerce(kind: Field, v: unknown) {
  if (kind === "bool") {
    if (typeof v === "boolean") return v;
    if (v === "true" || v === "false") return v === "true";
  } else if (kind === "int") {
    if (typeof v === "number" && Number.isInteger(v) && v >= 0) return v;
  } else if (typeof v === "string" && kind.includes(v)) return v;
  throw new HttpError(400, "Invalid value");
}

function must<T>(res: { data: T | null; error: Any | null; count?: number | null }) {
  if (res.error) throw Object.assign(new Error(res.error.message), { code: res.error.code });
  return res;
}

/** Has the email sign-in migration (profiles.email / user_id) been applied? */
async function authReady() {
  const r = await db().from("profiles").select("email, user_id").limit(1);
  return !isMissingColumn(r.error);
}

export async function POST(req: Request) {
  if (!supabaseConfigured) return NextResponse.json({ error: "Supabase is not configured on the server." }, { status: 503 });
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Admin session expired. Sign in again." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Any | null;
  if (!body?.op) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    return NextResponse.json(await handle(admin, body));
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (isMissingTable(e as Any)) return NextResponse.json({ error: "Tables not found — run the migration first.", code: "NO_TABLES" }, { status: 409 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

async function handle(admin: AdminSession, b: Any): Promise<Any> {
  const s = db();
  const who = `admin:${admin.email}`;

  switch (b.op) {
    case "status": {
      const res = await s.from("settings").select("key", { count: "exact", head: true });
      if (isMissingTable(res.error)) return { tables: false, seeded: false };
      if (res.error) throw new Error(res.error.message);
      const [cars, settings] = await Promise.all([s.from("cars").select("id", { count: "exact", head: true }), readSettings()]);
      // A live-data platform doesn't need the sample catalogue loaded.
      return { tables: true, seeded: (cars.count ?? 0) > 0 || settings.dataMode === "live", mode: settings.dataMode, authReady: await authReady() };
    }

    case "auth.status": {
      // Supabase's public auth settings say whether it sends confirmation emails ("Confirm email" in the dashboard).
      let autoconfirm: boolean | null = null;
      try {
        const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
          headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "" },
          cache: "no-store",
          signal: AbortSignal.timeout(6000),
        });
        if (r.ok) autoconfirm = ((await r.json()) as { mailer_autoconfirm?: boolean }).mailer_autoconfirm ?? null;
      } catch {}
      const project = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(/https:\/\/([^.]+)/)?.[1] ?? null;
      return { ready: await authReady(), autoconfirm, project, siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null };
    }

    case "seed": {
      const r = await seedDatabase();
      await audit(who, "seed", "database", null, r);
      return { ok: true, ...r };
    }

    case "stats":
      return stats();

    case "list": {
      const e = ENTITIES[b.entity];
      if (!e) throw new HttpError(400, "Unknown entity");
      const limit = Math.min(100, Math.max(1, Number(b.limit) || 50));
      const page = Math.max(0, Number(b.page) || 0);
      let q = s.from(e.table).select(e.select ?? "*", { count: "exact" });
      if (e.live && (await readSettings()).dataMode === "live") q = e.live(q);
      const term = clean(String(b.q ?? ""));
      if (term) q = q.or(e.search.map((c) => `${c}.ilike.*${term}*`).join(","));
      for (const [k, v] of Object.entries((b.filters ?? {}) as Any)) {
        if (v === "" || v == null) continue;
        const kind = e.filters?.[k];
        if (!kind) throw new HttpError(400, `Can't filter by ${k}`);
        q = q.eq(k, coerce(kind, v) as never);
      }
      const res = must(await q.order(e.order, { ascending: false }).range(page * limit, page * limit + limit - 1));
      let rows = (res.data ?? []) as unknown as Any[];
      if (b.entity === "businesses") rows = await withVerificationRequests(rows);
      return { rows, total: res.count ?? rows.length };
    }

    case "update": {
      const e = ENTITIES[b.entity];
      if (!e?.edit) throw new HttpError(400, "This record type is read-only");
      const patch: Any = {};
      for (const [k, v] of Object.entries((b.patch ?? {}) as Any)) {
        const kind = e.edit[k];
        if (!kind) throw new HttpError(400, `${k} can't be edited`);
        patch[k] = coerce(kind, v);
      }
      if (!Object.keys(patch).length) throw new HttpError(400, "Nothing to update");
      const before = must(await s.from(e.table).select(Object.keys(patch).join(", ")).eq(e.pk, b.id).maybeSingle()).data;
      if (!before) throw new HttpError(404, "Not found");
      must(await s.from(e.table).update(patch).eq(e.pk, b.id));
      // Suspending a business also suspends the owner's login.
      if (b.entity === "businesses" && patch.status) await s.from("profiles").update({ status: patch.status }).eq("business_id", b.id);
      await audit(who, `${b.entity}.update`, e.table, String(b.id), { before, after: patch, reason: String(b.reason ?? "").slice(0, 300) || undefined });
      return { ok: true };
    }

    case "delete": {
      const e = ENTITIES[b.entity];
      if (!e?.deletable) throw new HttpError(400, "This record type can't be deleted");
      must(await s.from(e.table).delete().eq(e.pk, b.id));
      await audit(who, `${b.entity}.delete`, e.table, String(b.id));
      return { ok: true };
    }

    case "order.fulfil": {
      const STATUSES = ["placed", "packed", "shipped", "delivered", "cancelled"];
      if (!STATUSES.includes(b.status)) throw new HttpError(400, "Invalid status");
      const order = must(await s.from("orders").select("fulfil").eq("id", b.id).maybeSingle()).data as Any | null;
      if (!order || !(b.seller in order.fulfil)) throw new HttpError(404, "Not found");
      must(await s.from("orders").update({ fulfil: { ...order.fulfil, [b.seller]: b.status } }).eq("id", b.id));
      await audit(who, "orders.fulfil", "orders", b.id, { seller: b.seller, from: order.fulfil[b.seller], to: b.status });
      return { ok: true };
    }

    case "order.refund": {
      const order = must(await s.from("orders").select("fulfil, total").eq("id", b.id).maybeSingle()).data as Any | null;
      if (!order) throw new HttpError(404, "Not found");
      const fulfil = Object.fromEntries(Object.keys(order.fulfil).map((k) => [k, "cancelled"]));
      must(await s.from("orders").update({ refunded: true, fulfil }).eq("id", b.id));
      await audit(who, "orders.refund", "orders", b.id, { total: order.total, reason: String(b.reason ?? "").slice(0, 300) });
      return { ok: true };
    }

    case "thread": {
      const msgs = must(await s.from("messages").select("id, sender, body, hidden, created_at").eq("thread_id", b.id).order("created_at")).data;
      return { messages: msgs };
    }
    case "message.hide": {
      must(await s.from("messages").update({ hidden: !!b.hidden }).eq("id", b.id));
      await audit(who, b.hidden ? "messages.hide" : "messages.unhide", "messages", String(b.id));
      return { ok: true };
    }

    case "quotes": {
      return { quotes: must(await s.from("quotes").select("*").eq("request_id", b.id).order("price")).data };
    }

    case "pipeline":
      return pipeline();

    case "settings.get":
      return { settings: await readSettings() };
    case "settings.set": {
      const v = b.settings as Any;
      const rows: Any[] = [];
      if (v.feePercent !== undefined) {
        const n = Number(v.feePercent);
        if (!(n >= 0 && n <= 20)) throw new HttpError(400, "Fee must be between 0 and 20%");
        rows.push({ key: "fee_percent", value: Math.round(n * 100) / 100 });
      }
      if (v.dataMode !== undefined) {
        if (v.dataMode !== "stock" && v.dataMode !== "live") throw new HttpError(400, "Unknown data pipeline");
        rows.push({ key: "data_mode", value: v.dataMode });
      }
      if (!rows.length) throw new HttpError(400, "Nothing to update");
      const before = await readSettings();
      must(await s.from("settings").upsert(rows, { onConflict: "key" }));
      invalidateSettings();
      await audit(who, v.dataMode !== undefined && v.dataMode !== before.dataMode ? "pipeline.switch" : "settings.update", "settings", null, {
        ...Object.fromEntries(rows.map((r) => [r.key, r.value])),
        reason: String(b.reason ?? "").slice(0, 300) || undefined,
      });
      return { ok: true, settings: await readSettings() };
    }

    /* Engines — see lib/engines.ts. One engine per call, so two admins editing different engines don't clash. */
    case "engines.get":
      return { engines: (await readSettings()).engines, now: Date.now() };
    case "engines.set": {
      const key = String(b.key) as EngineKey;
      if (!ENGINE_BY_KEY[key]) throw new HttpError(400, "Unknown engine");
      const current = (await readSettings()).engines;
      // `state: null` resets the engine to its defaults.
      const next = cleanEngine(key, b.state === null ? null : { ...current[key], ...(b.state as Any), params: { ...current[key].params, ...((b.state as Any)?.params ?? {}) } });
      if (next.from && next.until && next.until <= next.from) throw new HttpError(400, "The end time must be after the start time.");
      await writeEngines({ ...current, [key]: next });
      await audit(who, "engine.update", "settings", key, { before: current[key], after: next, reason: String(b.reason ?? "").slice(0, 300) || undefined });
      return { ok: true, engine: next, engines: (await readSettings()).engines };
    }

    case "admins.list": {
      // Marketplace accounts live in Supabase Auth too, so page through everyone to find the admins.
      const users = [];
      for (let page = 1; page <= 50; page++) {
        const { data, error } = await s.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw new Error(error.message);
        users.push(...data.users);
        if (data.users.length < 1000) break;
      }
      return {
        admins: users
          .filter((u) => u.app_metadata?.role === "admin")
          .map((u) => ({ id: u.id, email: u.email, lastSignIn: u.last_sign_in_at, createdAt: u.created_at, me: u.id === admin.uid })),
      };
    }
    case "admins.create": {
      const email = String(b.email ?? "").trim().toLowerCase();
      const password = String(b.password ?? "");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Enter a valid email");
      if (password.length < 12) throw new HttpError(400, "Password must be at least 12 characters");
      const { error } = await s.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: "admin" } });
      if (error) throw new HttpError(400, error.message);
      await audit(who, "admins.create", "auth.users", email);
      return { ok: true };
    }
    case "admins.revoke": {
      if (b.id === admin.uid) throw new HttpError(400, "You can't remove your own admin access");
      const { error } = await s.auth.admin.updateUserById(String(b.id), { app_metadata: { role: null } });
      if (error) throw new HttpError(400, error.message);
      await audit(who, "admins.revoke", "auth.users", String(b.id));
      return { ok: true };
    }
    case "admins.password": {
      const password = String(b.password ?? "");
      if (password.length < 12) throw new HttpError(400, "Password must be at least 12 characters");
      const { error } = await s.auth.admin.updateUserById(admin.uid, { password });
      if (error) throw new HttpError(400, error.message);
      await audit(who, "admins.password", "auth.users", admin.uid);
      return { ok: true };
    }

    default:
      throw new HttpError(400, "Unknown operation");
  }
}

async function withVerificationRequests(rows: Any[]) {
  const ids = rows.filter((r) => !r.verified).map((r) => r.id);
  if (!ids.length) return rows;
  const { data } = await db().from("audit_log").select("entity_id").eq("action", "verification.requested").in("entity_id", ids);
  const pending = new Set((data ?? []).map((d) => d.entity_id));
  return rows.map((r) => ({ ...r, verification_requested: pending.has(r.id) }));
}

async function stats() {
  const s = db();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [profiles, businesses, cars, parts, orders, bookings, requests, threads, audits, settings] = await Promise.all([
    s.from("profiles").select("phone, role, status, created_at").then(must),
    s.from("businesses").select("id, type, verified, status").then(must),
    s.from("cars").select("status, price, source").then(must),
    s.from("parts").select("active, stock, source").then(must),
    s.from("orders").select("total, fulfil, refunded, created_at, customer_phone").then(must),
    s.from("bookings").select("total, status, created_at, company_id, customer_phone").then(must),
    s.from("part_requests").select("status, customer_phone").then(must),
    s.from("threads").select("business_id, customer_phone").then(must),
    s.from("audit_log").select("*").order("created_at", { ascending: false }).limit(12).then(must),
    readSettings(),
  ]);
  // On live data, every figure leaves out the sample catalogue and demo activity.
  const live = settings.dataMode === "live";
  const keep = (rows: Any[] | null, stock: (r: Any) => boolean) => ((rows ?? []) as Any[]).filter((r) => !live || !stock(r));
  const P = keep(profiles.data, (r) => isDemoPhone(r.phone));
  const B = keep(businesses.data, (r) => isStockBusiness(r.id));
  const C = keep(cars.data, (r) => r.source === "catalog");
  const PT = keep(parts.data, (r) => r.source === "catalog");
  const O = keep(orders.data, isStockOrder);
  const BK = keep(bookings.data, isStockActivity);
  const R = keep(requests.data, isStockActivity);
  const T = keep(threads.data, isStockActivity);

  const validOrders = O.filter((o) => !o.refunded);
  const gmvOrders = validOrders.reduce((a, o) => a + Number(o.total), 0);
  const paidBookings = BK.filter((b) => ["confirmed", "active", "completed"].includes(b.status));
  const gmvRentals = paidBookings.reduce((a, b) => a + Number(b.total), 0);

  const days = (n: number) =>
    Array.from({ length: n }, (_, i) => {
      const d = new Date(Date.now() - (n - 1 - i) * 864e5);
      return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }) };
    });
  const byDay = <T extends Any>(rows: T[], n: number, val: (r: T) => number) => {
    const ds = days(n);
    const m = new Map(ds.map((d) => [d.key, 0]));
    for (const r of rows) {
      const k = String(r.created_at).slice(0, 10);
      if (m.has(k)) m.set(k, m.get(k)! + val(r));
    }
    return ds.map((d) => ({ label: d.label, value: m.get(d.key)! }));
  };

  const count = <T extends Any>(rows: T[], key: string) => rows.reduce<Record<string, number>>((a, r) => ((a[r[key]] = (a[r[key]] ?? 0) + 1), a), {});

  return {
    settings,
    users: { total: P.length, byRole: count(P, "role"), suspended: P.filter((p) => p.status === "suspended").length, new30: P.filter((p) => p.created_at >= since).length },
    businesses: { total: B.length, byType: count(B, "type"), unverified: B.filter((b) => !b.verified).length, suspended: B.filter((b) => b.status === "suspended").length },
    cars: { total: C.length, byStatus: count(C, "status") },
    parts: { total: PT.length, inactive: PT.filter((p) => !p.active).length, outOfStock: PT.filter((p) => p.stock === 0).length },
    orders: {
      total: O.length, gmv: gmvOrders, refunded: O.filter((o) => o.refunded).length,
      open: validOrders.filter((o) => Object.values(o.fulfil as Any).some((v) => v === "placed" || v === "packed")).length,
    },
    bookings: { total: BK.length, gmv: gmvRentals, pending: BK.filter((b) => b.status === "pending").length },
    requests: { open: R.filter((r) => r.status === "open").length },
    threads: { total: T.length },
    revenue: { gmv: gmvOrders + gmvRentals, commission: Math.round(((gmvOrders + gmvRentals) * settings.feePercent) / 100) },
    signups: byDay(P, 30, () => 1),
    sales: byDay(validOrders, 14, (o) => Number(o.total)),
    recent: audits.data,
  };
}

/** Record counts on each side of the data pipeline, so the admin knows what a switch will show. */
async function pipeline() {
  const s = db();
  const [settings, biz, cars, parts, vehicles, profiles] = await Promise.all([
    readSettings(),
    s.from("businesses").select("id").then(must),
    s.from("cars").select("source, status").then(must),
    s.from("parts").select("source, active").then(must),
    s.from("vehicles").select("source, status").then(must),
    s.from("profiles").select("phone").then(must),
  ]);
  const split = (rows: Any[] | null, stock: (r: Any) => boolean) => {
    const R = (rows ?? []) as Any[];
    const n = R.filter(stock).length;
    return { stock: n, live: R.length - n };
  };
  return {
    mode: settings.dataMode,
    counts: {
      businesses: split(biz.data, (r) => isStockBusiness(r.id)),
      cars: split(cars.data, (r) => r.source === "catalog"),
      parts: split(parts.data, (r) => r.source === "catalog"),
      vehicles: split(vehicles.data, (r) => r.source === "catalog"),
      users: split(profiles.data, (r) => isDemoPhone(r.phone)),
    },
  };
}

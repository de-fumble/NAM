"use client";

import Link from "next/link";
import {
  BadgeCheck, Ban, CalendarDays, CarFront, Check, ClipboardList, Database, ExternalLink, Eye, EyeOff, Info, MailCheck, Package, Radio, RotateCcw, Star, Trash2,
  TrendingUp, TriangleAlert, UsersRound, Wallet,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn, img, naira, nairaShort } from "@/lib/utils";
import { toast } from "@/lib/store";
import { Avatar, Button, Field, Img, Input, Select, Sheet, Toggle } from "../ui";
import { AreaChart, BarChart, Meter, PageHead, Panel, Stat, Status, timeAgo, type Tone } from "../dashboard/kit";
import { EntityTable, JsonView, Mono, RowBtn, adminApi, confirm, mutate, usePipeline, type DataMode, type Row } from "./kit";
import { useAdminSection } from "./shell";
import { EngineSummary, EnginesScreen } from "./engines";
import { cleanEngine, type EngineState } from "@/lib/engines";

const ago = (v: string) => timeAgo(new Date(v).getTime());
const date = (v: string) => new Date(v).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
const opts = (xs: string[]) => xs.map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }));
const BOOL = [{ value: "true", label: "Yes" }, { value: "false", label: "No" }];

const TONES: Record<string, Tone> = {
  active: "good", available: "good", delivered: "good", completed: "good", won: "good", open: "info", confirmed: "info", shipped: "info", packed: "info",
  paused: "neutral", closed: "neutral", sold: "info", contacted: "neutral", new: "info", maintenance: "warning", pending: "warning", placed: "warning",
  viewing: "warning", negotiating: "warning", suspended: "critical", removed: "critical", declined: "critical", cancelled: "critical", lost: "critical",
};
const Pill = ({ v }: { v: string }) => <Status tone={TONES[v] ?? "neutral"}>{v[0].toUpperCase() + v.slice(1)}</Status>;

/* ───────────────────────────── Router ───────────────────────────── */

export function AdminScreen() {
  const s = useAdminSection();
  const map: Record<string, () => ReactNode> = {
    overview: () => <Overview />, users: () => <Users />, businesses: () => <Businesses />, cars: () => <Cars />, parts: () => <Parts />,
    fleet: () => <Fleet />, orders: () => <Orders />, bookings: () => <Bookings />, leads: () => <Leads />, messages: () => <Messages />,
    requests: () => <Requests />, engines: () => <EnginesScreen />, settings: () => <SettingsScreen />, audit: () => <Audit />,
  };
  return <>{(map[s] ?? map.overview)()}</>;
}

/* ───────────────────────────── Overview ───────────────────────────── */

function Overview() {
  const [s, setS] = useState<Row | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    adminApi("stats").then(setS).catch((e) => setErr(e.message));
  }, []);
  if (err) return <p className="text-[#b3261e]">{err}</p>;
  if (!s) return <PageHead title="Overview" sub="Loading the marketplace…" />;
  const roles = s.users.byRole as Record<string, number>;
  return (
    <>
      <PageHead
        title="Overview"
        sub={`${s.settings.dataMode === "live" ? "Live data" : "Stock data, including the sample catalogue"} · Platform fee ${s.settings.feePercent}% · ${s.users.total.toLocaleString()} people · ${s.businesses.total} businesses`}
      />
      <div className="mb-4">
        <EngineSummary />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Gross volume" value={nairaShort(s.revenue.gmv)} hint="parts orders + rentals" icon={TrendingUp} />
        <Stat label="Platform commission" value={nairaShort(s.revenue.commission)} hint={`at ${s.settings.feePercent}%`} icon={Wallet} />
        <Stat label="Users" value={s.users.total.toLocaleString()} hint={`${s.users.new30} new in 30 days`} icon={UsersRound} />
        <Stat label="Live car listings" value={(s.cars.byStatus.active ?? 0).toLocaleString()} hint={`${s.cars.byStatus.removed ?? 0} removed`} icon={CarFront} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AttentionTile href="/admin/businesses" label="Unverified businesses" value={s.businesses.unverified} icon={BadgeCheck} />
        <AttentionTile href="/admin/orders" label="Orders to fulfil" value={s.orders.open} icon={Package} />
        <AttentionTile href="/admin/bookings" label="Bookings awaiting approval" value={s.bookings.pending} icon={CalendarDays} />
        <AttentionTile href="/admin/requests" label="Open part requests" value={s.requests.open} icon={ClipboardList} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Sign-ups" action={<span className="text-[12px] text-faint">Last 30 days</span>}>
          <AreaChart data={s.signups} format={(n) => String(Math.round(n))} />
        </Panel>
        <Panel title="Parts sales" action={<span className="text-[12px] text-faint">Last 14 days</span>}>
          <BarChart data={s.sales} format={nairaShort} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Panel title="Users by role">
          <div className="space-y-5">
            {(["customer", "dealer", "rental", "parts"] as const).map((r) => (
              <Meter key={r} label={{ customer: "Customers", dealer: "Car dealers", rental: "Rental companies", parts: "Parts dealers" }[r]} value={s.users.total ? (roles[r] ?? 0) / s.users.total : 0} sub={`${roles[r] ?? 0} accounts`} />
            ))}
          </div>
        </Panel>
        <Panel title="Recent activity" action={<Link href="/admin/audit" className="text-[13px] font-medium text-link hover:underline">Audit log</Link>} pad={false}>
          <ul className="divide-y divide-hair">
            {(s.recent as Row[]).map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-6 py-3">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", a.actor.startsWith("admin") ? "bg-ink" : a.actor === "system" ? "bg-faint" : "bg-brand")} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px]"><span className="font-medium">{a.action}</span> <span className="text-mute">· {a.entity_id ?? a.entity}</span></div>
                  <div className="truncate text-[12px] text-faint">{a.actor}</div>
                </div>
                <span className="shrink-0 text-[12px] text-faint">{ago(a.created_at)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function AttentionTile({ href, label, value, icon: Icon }: { href: string; label: string; value: number; icon: typeof Package }) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-[22px] bg-white p-5 shadow-card ring-1 ring-black/[0.03] transition hover:-translate-y-0.5">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full", value ? "bg-[#fff4d6] text-[#8a5a00]" : "bg-mist text-faint")}>
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <div className="text-[24px] font-semibold tabular-nums leading-none">{value}</div>
        <div className="mt-1 truncate text-[13px] text-mute">{label}</div>
      </div>
    </Link>
  );
}

/* ───────────────────────────── People ───────────────────────────── */

async function setStatus(entity: string, id: string, current: string, name: string, reload: () => void) {
  const suspend = current !== "suspended";
  const r = await confirm({
    title: suspend ? `Suspend ${name}?` : `Reinstate ${name}?`,
    body: suspend
      ? entity === "businesses"
        ? "Their storefront and listings are hidden and the owner is signed out."
        : "They're signed out and can't sign back in."
      : "They'll be able to sign in and trade again.",
    action: suspend ? "Suspend" : "Reinstate",
    danger: suspend,
    reason: suspend,
  });
  if (r.ok && (await mutate("update", { entity, id, patch: { status: suspend ? "suspended" : "active" }, reason: r.reason }, suspend ? "Suspended" : "Reinstated"))) reload();
}

function Users() {
  return (
    <>
      <PageHead title="Users" sub="Everyone with an account: buyers and business owners." />
      <EntityTable
        entity="users"
        searchPlaceholder="Search name, email or phone"
        filters={[{ key: "role", label: "Role", options: opts(["customer", "dealer", "rental", "parts"]) }, { key: "status", label: "Status", options: opts(["active", "suspended"]) }]}
        columns={[
          { key: "name", label: "Person", render: (r) => <div className="flex items-center gap-3"><Avatar name={r.name} hue={r.name.length * 31} size={32} /><div className="min-w-0"><div className="font-medium">{r.name}</div>{r.email && <div className="truncate text-[12px] text-mute">{r.email}</div>}<Mono>{r.phone}</Mono></div></div> },
          { key: "role", label: "Role", render: (r) => <span className="capitalize">{r.role}</span> },
          { key: "business_id", label: "Business", render: (r) => (r.business_id ? <Link href={`/store/${r.business_id}`} target="_blank" className="text-link hover:underline">{r.business_id}</Link> : <span className="text-faint">—</span>) },
          { key: "status", label: "Status", render: (r) => <Pill v={r.status} /> },
          { key: "created_at", label: "Joined", render: (r) => date(r.created_at) },
          { key: "last_seen_at", label: "Last seen", render: (r) => ago(r.last_seen_at) },
        ]}
        actions={(r, reload) => (
          <RowBtn tone={r.status === "suspended" ? "default" : "danger"} onClick={() => setStatus("users", r.phone, r.status, r.name, reload)}>
            {r.status === "suspended" ? <><RotateCcw className="h-3.5 w-3.5" /> Reinstate</> : <><Ban className="h-3.5 w-3.5" /> Suspend</>}
          </RowBtn>
        )}
      />
    </>
  );
}

function Businesses() {
  return (
    <>
      <PageHead title="Businesses" sub="Verify dealers, rental companies and parts sellers, or suspend bad actors." />
      <EntityTable
        entity="businesses"
        searchPlaceholder="Search name, city or phone"
        filters={[
          { key: "type", label: "Type", options: opts(["dealer", "rental", "parts"]) },
          { key: "verified", label: "Verified", options: BOOL },
          { key: "status", label: "Status", options: opts(["active", "suspended"]) },
        ]}
        columns={[
          {
            key: "name", label: "Business",
            render: (r) => (
              <div className="flex items-center gap-3">
                <Avatar name={r.name} hue={r.hue} size={34} />
                <div>
                  <div className="flex items-center gap-1 font-medium">{r.name}{r.verified && <BadgeCheck className="h-4 w-4 text-link" />}</div>
                  <div className="text-[12px] text-mute">{r.city}, {r.state}</div>
                </div>
              </div>
            ),
          },
          { key: "type", label: "Type", render: (r) => <span className="capitalize">{r.type}</span> },
          { key: "verified", label: "Verification", render: (r) => (r.verified ? <Status tone="good">Verified</Status> : r.verification_requested ? <Status tone="warning">Requested</Status> : <Status tone="neutral">Unverified</Status>) },
          { key: "status", label: "Status", render: (r) => <Pill v={r.status} /> },
          { key: "owner_phone", label: "Owner", render: (r) => (r.owner_phone ? <Mono>{r.owner_phone}</Mono> : <span className="text-faint">Unclaimed</span>) },
          { key: "created_at", label: "Joined", render: (r) => date(r.created_at) },
        ]}
        actions={(r, reload) => (
          <>
            <RowBtn
              tone={r.verified ? "default" : "brand"}
              onClick={async () => (await mutate("update", { entity: "businesses", id: r.id, patch: { verified: !r.verified } }, r.verified ? "Verification removed" : "Business verified")) && reload()}
            >
              <BadgeCheck className="h-3.5 w-3.5" /> {r.verified ? "Unverify" : "Verify"}
            </RowBtn>
            <RowBtn tone={r.status === "suspended" ? "default" : "danger"} onClick={() => setStatus("businesses", r.id, r.status, r.name, reload)}>
              {r.status === "suspended" ? "Reinstate" : "Suspend"}
            </RowBtn>
            <Link href={`/store/${r.id}`} target="_blank" className="grid h-8 w-8 place-items-center rounded-full bg-mist hover:bg-hair" aria-label="Open storefront"><ExternalLink className="h-3.5 w-3.5" /></Link>
          </>
        )}
      />
    </>
  );
}

/* ───────────────────────────── Catalogue ───────────────────────────── */

function PriceCell({ entity, id, value, field }: { entity: string; id: string; value: number; field: string }) {
  return (
    <div className="relative w-36" onClick={(e) => e.stopPropagation()}>
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-mute">₦</span>
      <input
        key={value}
        defaultValue={Number(value).toLocaleString("en-NG")}
        onBlur={async (e) => {
          const n = Number(e.target.value.replace(/\D/g, ""));
          if (n > 0 && n !== Number(value)) await mutate("update", { entity, id, patch: { [field]: n } }, "Price updated");
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        aria-label="Price"
        className="h-9 w-full rounded-lg border border-line pl-6 pr-2 text-right text-[13px] font-semibold tabular-nums outline-none focus:border-link"
      />
    </div>
  );
}

async function toggleRemoved(entity: string, id: string, removed: boolean, name: string, restoreTo: string, reload: () => void) {
  if (!removed) {
    const r = await confirm({ title: `Remove “${name}”?`, body: "It disappears from the marketplace. The seller sees it as removed by an admin.", action: "Remove", danger: true, reason: true });
    if (!r.ok) return;
    if (await mutate("update", { entity, id, patch: { status: "removed" }, reason: r.reason }, "Removed from marketplace")) reload();
  } else if (await mutate("update", { entity, id, patch: { status: restoreTo } }, "Restored")) reload();
}

function Cars() {
  return (
    <>
      <PageHead title="Car listings" sub="Moderate listings, feature the best ones on the home page, and correct prices." />
      <EntityTable
        entity="cars"
        searchPlaceholder="Search make, model or seller"
        filters={[
          { key: "status", label: "Status", options: opts(["active", "paused", "sold", "removed"]) },
          { key: "featured", label: "Featured", options: BOOL },
          { key: "source", label: "Source", options: [{ value: "user", label: "User listings" }, { value: "catalog", label: "Catalogue" }] },
        ]}
        columns={[
          {
            key: "make", label: "Listing",
            render: (r) => (
              <Link href={`/cars/${r.id}`} target="_blank" className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                {r.img && <Img src={img(r.img, 160, { h: 120 })} alt="" className="h-10 w-14 shrink-0 rounded-lg" />}
                <div>
                  <div className="font-medium">{r.year} {r.make} {r.model}</div>
                  <div className="text-[12px] text-mute">{r.condition} · {r.city}</div>
                  {r.vin && (
                    <div className="mt-0.5 font-mono text-[11px] text-mute" title={r.vin_match === "true" ? "VIN decodes to this make and year" : "VIN doesn't match the listing, or couldn't be decoded"}>
                      {r.vin} {r.vin_match === "true" ? <span className="font-sans text-brand">✓ matched</span> : <span className="font-sans text-gold">unmatched</span>}
                    </div>
                  )}
                </div>
              </Link>
            ),
          },
          { key: "seller_id", label: "Seller", render: (r) => <Mono>{r.seller_id}</Mono> },
          { key: "price", label: "Price", render: (r) => <PriceCell entity="cars" id={r.id} value={r.price} field="price" /> },
          { key: "status", label: "Status", render: (r) => <Pill v={r.status} /> },
          { key: "created_at", label: "Listed", render: (r) => date(r.created_at) },
        ]}
        actions={(r, reload) => (
          <>
            <RowBtn onClick={async () => (await mutate("update", { entity: "cars", id: r.id, patch: { featured: !r.featured } }, r.featured ? "Unfeatured" : "Featured on home page")) && reload()}>
              <Star className={cn("h-3.5 w-3.5", r.featured && "fill-[#ff9f0a] text-[#ff9f0a]")} /> {r.featured ? "Featured" : "Feature"}
            </RowBtn>
            <RowBtn tone={r.status === "removed" ? "default" : "danger"} onClick={() => toggleRemoved("cars", r.id, r.status === "removed", `${r.year} ${r.make} ${r.model}`, "active", reload)}>
              {r.status === "removed" ? <><RotateCcw className="h-3.5 w-3.5" /> Restore</> : <><Trash2 className="h-3.5 w-3.5" /> Remove</>}
            </RowBtn>
          </>
        )}
      />
    </>
  );
}

function Parts() {
  return (
    <>
      <PageHead title="Parts" sub="Hide counterfeit or mis-described parts and correct prices or stock." />
      <EntityTable
        entity="parts"
        searchPlaceholder="Search part, category or seller"
        filters={[{ key: "active", label: "Listed", options: BOOL }, { key: "source", label: "Source", options: [{ value: "user", label: "Seller-added" }, { value: "catalog", label: "Catalogue" }] }]}
        columns={[
          { key: "name", label: "Part", render: (r) => <div><div className="max-w-[280px] truncate font-medium">{r.name}</div><div className="text-[12px] text-mute">{r.brand} · {r.category}</div></div> },
          { key: "seller_id", label: "Seller", render: (r) => <Mono>{r.seller_id}</Mono> },
          { key: "price", label: "Price", render: (r) => <PriceCell entity="parts" id={r.id} value={r.price} field="price" /> },
          { key: "stock", label: "Stock", render: (r) => <span className={cn("tabular-nums", r.stock === 0 && "text-[#b3261e]")}>{r.stock}</span> },
          { key: "active", label: "Status", render: (r) => (r.active ? <Status tone="good">Listed</Status> : <Status tone="critical">Hidden</Status>) },
        ]}
        actions={(r, reload) => (
          <RowBtn tone={r.active ? "danger" : "default"} onClick={async () => (await mutate("update", { entity: "parts", id: r.id, patch: { active: !r.active } }, r.active ? "Hidden from store" : "Listed again")) && reload()}>
            {r.active ? <><EyeOff className="h-3.5 w-3.5" /> Hide</> : <><Eye className="h-3.5 w-3.5" /> Show</>}
          </RowBtn>
        )}
      />
    </>
  );
}

function Fleet() {
  return (
    <>
      <PageHead title="Rental fleet" sub="Every rentable vehicle across all rental companies." />
      <EntityTable
        entity="vehicles"
        searchPlaceholder="Search vehicle or company"
        filters={[{ key: "status", label: "Status", options: opts(["available", "maintenance", "removed"]) }]}
        columns={[
          { key: "name", label: "Vehicle", render: (r) => <div className="flex items-center gap-3">{r.img && <Img src={img(r.img, 160, { h: 120 })} alt="" className="h-10 w-14 shrink-0 rounded-lg" />}<div><div className="font-medium">{r.name}</div><div className="text-[12px] text-mute">{r.category}</div></div></div> },
          { key: "company_id", label: "Company", render: (r) => <Mono>{r.company_id}</Mono> },
          { key: "daily", label: "Daily rate", render: (r) => <PriceCell entity="vehicles" id={r.id} value={r.daily} field="daily" /> },
          { key: "status", label: "Status", render: (r) => <Pill v={r.status} /> },
        ]}
        actions={(r, reload) => (
          <RowBtn tone={r.status === "removed" ? "default" : "danger"} onClick={() => toggleRemoved("vehicles", r.id, r.status === "removed", r.name, "available", reload)}>
            {r.status === "removed" ? "Restore" : "Remove"}
          </RowBtn>
        )}
      />
    </>
  );
}

/* ───────────────────────────── Activity ───────────────────────────── */

const FULFIL = ["placed", "packed", "shipped", "delivered", "cancelled"];

function Orders() {
  const [open, setOpen] = useState<{ row: Row; reload: () => void } | null>(null);
  const [key, setKey] = useState(0);
  return (
    <>
      <PageHead title="Orders" sub="Parts orders across every seller. Override fulfilment or refund a buyer." />
      <EntityTable
        entity="orders"
        refreshKey={key}
        searchPlaceholder="Search order number, buyer or phone"
        filters={[{ key: "refunded", label: "Refunded", options: BOOL }]}
        onOpen={(row, reload) => setOpen({ row, reload })}
        columns={[
          { key: "id", label: "Order", render: (r) => <span className="font-semibold">{r.id}</span> },
          { key: "customer_name", label: "Buyer", render: (r) => <div><div>{r.customer_name}</div><Mono>{r.customer_phone}</Mono></div> },
          { key: "fulfil", label: "Sellers", render: (r) => <div className="flex flex-wrap gap-1">{Object.entries(r.fulfil as Record<string, string>).map(([k, v]) => <span key={k} title={k}><Pill v={v} /></span>)}</div> },
          { key: "total", label: "Total", render: (r) => <span className="tabular-nums">{naira(r.total)}</span> },
          { key: "refunded", label: "Refund", render: (r) => (r.refunded ? <Status tone="critical">Refunded</Status> : <span className="text-faint">—</span>) },
          { key: "created_at", label: "Placed", render: (r) => ago(r.created_at) },
        ]}
      />
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.row.id} wide>
        {open && <OrderDetail row={open.row} done={() => { setOpen(null); setKey((k) => k + 1); }} />}
      </Sheet>
    </>
  );
}

function OrderDetail({ row, done }: { row: Row; done: () => void }) {
  const [fulfil, setFulfil] = useState<Record<string, string>>(row.fulfil);
  return (
    <div className="space-y-6 pb-2">
      <div className="grid grid-cols-2 gap-3 text-[14px]">
        <div><div className="text-faint">Buyer</div>{row.customer_name} · {row.customer_phone}</div>
        <div><div className="text-faint">Deliver to</div>{row.address}, {row.state}</div>
        <div><div className="text-faint">Payment</div><span className="capitalize">{row.pay}</span></div>
        <div><div className="text-faint">Total</div><span className="font-semibold">{naira(row.total)}</span></div>
      </div>
      <div className="divide-y divide-hair rounded-2xl ring-1 ring-hair">
        {Object.keys(fulfil).map((seller) => (
          <div key={seller} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <Mono>{seller}</Mono>
              <Select
                value={fulfil[seller]}
                onChange={async (e) => {
                  const status = e.target.value;
                  if (await mutate("order.fulfil", { id: row.id, seller, status }, "Fulfilment updated")) setFulfil({ ...fulfil, [seller]: status });
                }}
                className="h-9 w-40 rounded-full text-[13px]"
                aria-label={`Fulfilment for ${seller}`}
              >
                {FULFIL.map((f) => <option key={f} value={f}>{f}</option>)}
              </Select>
            </div>
            <ul className="mt-2 space-y-1">
              {(row.lines as Row[]).filter((l) => l.sellerId === seller).map((l) => (
                <li key={l.partId} className="flex justify-between text-[14px]"><span>{l.qty}× {l.name}</span><span className="tabular-nums text-mute">{naira(l.price * l.qty)}</span></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {!row.refunded && (
        <Button
          variant="secondary"
          className="w-full !text-[#b3261e]"
          onClick={async () => {
            const r = await confirm({ title: `Refund ${row.id}?`, body: `${naira(row.total)} goes back to ${row.customer_name} and every seller's part is cancelled.`, action: "Refund", danger: true, reason: true });
            if (r.ok && (await mutate("order.refund", { id: row.id, reason: r.reason }, "Order refunded"))) done();
          }}
        >
          <RotateCcw className="h-4 w-4" /> Refund order
        </Button>
      )}
    </div>
  );
}

function Bookings() {
  return (
    <>
      <PageHead title="Bookings" sub="Rental bookings across every company. Step in on disputes." />
      <EntityTable
        entity="bookings"
        searchPlaceholder="Search booking, vehicle, renter or company"
        filters={[{ key: "status", label: "Status", options: opts(["pending", "confirmed", "active", "completed", "declined", "cancelled"]) }]}
        columns={[
          { key: "id", label: "Booking", render: (r) => <div><div className="font-semibold">{r.vehicle}</div><Mono>{r.id}</Mono></div> },
          { key: "company_id", label: "Company", render: (r) => <Mono>{r.company_id}</Mono> },
          { key: "customer_name", label: "Renter", render: (r) => <div><div>{r.customer_name}</div><Mono>{r.customer_phone}</Mono></div> },
          { key: "start_date", label: "Dates", render: (r) => <span className="whitespace-nowrap">{r.start_date} → {r.end_date}</span> },
          { key: "total", label: "Total", render: (r) => <span className="tabular-nums">{naira(r.total)}</span> },
          { key: "status", label: "Status", render: (r) => <Pill v={r.status} /> },
        ]}
        actions={(r, reload) => (
          <Select
            value={r.status}
            onChange={async (e) => (await mutate("update", { entity: "bookings", id: r.id, patch: { status: e.target.value } }, "Booking updated")) && reload()}
            className="h-8 w-36 rounded-full text-[12px]"
            aria-label="Booking status"
          >
            {["pending", "confirmed", "active", "completed", "declined", "cancelled"].map((s) => <option key={s}>{s}</option>)}
          </Select>
        )}
      />
    </>
  );
}

function Leads() {
  return (
    <>
      <PageHead title="Leads" sub="Every enquiry, offer and inspection booking sent to car dealers." />
      <EntityTable
        entity="leads"
        searchPlaceholder="Search buyer, dealer or car"
        filters={[{ key: "kind", label: "Type", options: opts(["message", "offer", "inspection", "call"]) }, { key: "stage", label: "Stage", options: opts(["new", "contacted", "viewing", "negotiating", "won", "lost"]) }]}
        columns={[
          { key: "customer_name", label: "Buyer", render: (r) => <div><div className="font-medium">{r.customer_name}</div><Mono>{r.customer_phone}</Mono></div> },
          { key: "car_id", label: "Car", render: (r) => <Link href={`/cars/${r.car_id}`} target="_blank" className="text-link hover:underline">{r.car_id}</Link> },
          { key: "business_id", label: "Dealer", render: (r) => <Mono>{r.business_id}</Mono> },
          { key: "kind", label: "Type", render: (r) => <span className="capitalize">{r.kind}{r.amount ? ` · ${nairaShort(r.amount)}` : ""}</span> },
          { key: "stage", label: "Stage", render: (r) => <Pill v={r.stage} /> },
          { key: "created_at", label: "When", render: (r) => ago(r.created_at) },
        ]}
      />
    </>
  );
}

function Messages() {
  const [open, setOpen] = useState<Row | null>(null);
  const [key, setKey] = useState(0);
  return (
    <>
      <PageHead title="Messages" sub="Conversations between buyers and businesses. Hide abusive or scam messages." />
      <EntityTable
        entity="threads"
        refreshKey={key}
        searchPlaceholder="Search buyer or business"
        onOpen={(r) => setOpen(r)}
        columns={[
          { key: "customer_name", label: "Buyer", render: (r) => <div><div className="font-medium">{r.customer_name}</div><Mono>{r.customer_phone}</Mono></div> },
          { key: "business_id", label: "Business", render: (r) => <Mono>{r.business_id}</Mono> },
          { key: "topic", label: "About", render: (r) => <span className="max-w-[260px] truncate">{r.topic?.title}</span> },
          { key: "updated_at", label: "Last message", render: (r) => ago(r.updated_at) },
        ]}
      />
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.topic?.title} wide>
        {open && <ThreadDetail thread={open} onDeleted={() => { setOpen(null); setKey((k) => k + 1); }} />}
      </Sheet>
    </>
  );
}

function ThreadDetail({ thread, onDeleted }: { thread: Row; onDeleted: () => void }) {
  const [msgs, setMsgs] = useState<Row[] | null>(null);
  useEffect(() => {
    adminApi<{ messages: Row[] }>("thread", { id: thread.id }).then((r) => setMsgs(r.messages));
  }, [thread.id]);
  return (
    <div className="pb-2">
      <p className="text-[13px] text-mute">{thread.customer_name} ↔ {thread.business_id}</p>
      <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto">
        {!msgs ? <p className="text-[14px] text-faint">Loading…</p> : msgs.map((m) => (
          <div key={m.id} className={cn("group flex items-end gap-2", m.sender === "customer" ? "justify-start" : "flex-row-reverse")}>
            <div className={cn("max-w-[75%] rounded-[18px] px-3.5 py-2 text-[14px]", m.hidden ? "bg-[#fdecea] text-[#8c1d18] line-through" : m.sender === "customer" ? "bg-mist" : "bg-link text-white")}>
              {m.body}
              <div className={cn("mt-0.5 text-[10px]", m.sender === "customer" || m.hidden ? "text-faint" : "text-white/70")}>{m.sender} · {ago(m.created_at)}</div>
            </div>
            <button
              onClick={async () => {
                if (await mutate("message.hide", { id: m.id, hidden: !m.hidden }, m.hidden ? "Message restored" : "Message hidden")) setMsgs(msgs.map((x) => (x.id === m.id ? { ...x, hidden: !m.hidden } : x)));
              }}
              className="mb-1 grid h-7 w-7 place-items-center rounded-full text-faint opacity-0 transition hover:bg-mist hover:text-ink group-hover:opacity-100"
              aria-label={m.hidden ? "Restore message" : "Hide message"}
            >
              {m.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          </div>
        ))}
      </div>
      <Button
        variant="secondary"
        className="mt-6 w-full !text-[#b3261e]"
        onClick={async () => {
          const r = await confirm({ title: "Delete this conversation?", body: "All messages are permanently deleted for both sides.", action: "Delete", danger: true });
          if (r.ok && (await mutate("delete", { entity: "threads", id: thread.id }, "Conversation deleted"))) onDeleted();
        }}
      >
        <Trash2 className="h-4 w-4" /> Delete conversation
      </Button>
    </div>
  );
}

function Requests() {
  const [open, setOpen] = useState<Row | null>(null);
  return (
    <>
      <PageHead title="Part requests" sub="What buyers are looking for, and the quotes they've received." />
      <EntityTable
        entity="requests"
        searchPlaceholder="Search part, car or buyer"
        filters={[{ key: "status", label: "Status", options: opts(["open", "closed"]) }]}
        onOpen={(r) => setOpen(r)}
        columns={[
          { key: "part", label: "Part", render: (r) => <div><div className="font-medium">{r.part}</div><div className="text-[12px] text-mute">{r.vehicle}</div></div> },
          { key: "customer_name", label: "Buyer", render: (r) => <div><div>{r.customer_name}</div><Mono>{r.customer_phone}</Mono></div> },
          { key: "state", label: "State" },
          { key: "status", label: "Status", render: (r) => <Pill v={r.status} /> },
          { key: "created_at", label: "Posted", render: (r) => ago(r.created_at) },
        ]}
        actions={(r, reload) => (
          <>
            <RowBtn onClick={async () => (await mutate("update", { entity: "requests", id: r.id, patch: { status: r.status === "open" ? "closed" : "open" } }, r.status === "open" ? "Request closed" : "Request reopened")) && reload()}>
              {r.status === "open" ? "Close" : "Reopen"}
            </RowBtn>
            <RowBtn
              tone="danger"
              onClick={async () => {
                const c = await confirm({ title: "Delete this request?", body: "The request and all its quotes are permanently deleted.", action: "Delete", danger: true });
                if (c.ok && (await mutate("delete", { entity: "requests", id: r.id }, "Request deleted"))) reload();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </RowBtn>
          </>
        )}
      />
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.part}>
        {open && <Quotes id={open.id} />}
      </Sheet>
    </>
  );
}

function Quotes({ id }: { id: string }) {
  const [q, setQ] = useState<Row[] | null>(null);
  useEffect(() => {
    adminApi<{ quotes: Row[] }>("quotes", { id }).then((r) => setQ(r.quotes));
  }, [id]);
  if (!q) return <p className="pb-4 text-[14px] text-faint">Loading…</p>;
  if (!q.length) return <p className="pb-4 text-[14px] text-mute">No quotes yet.</p>;
  return (
    <ul className="divide-y divide-hair pb-2">
      {q.map((x) => (
        <li key={x.business_id} className="flex items-center justify-between gap-4 py-3">
          <div><Mono>{x.business_id}</Mono>{x.note && <div className="text-[13px] text-mute">{x.note}</div>}</div>
          <span className="font-semibold tabular-nums">{naira(x.price)}</span>
        </li>
      ))}
    </ul>
  );
}

/* ───────────────────────────── Platform ───────────────────────────── */

type AuthStatus = { ready: boolean; autoconfirm: boolean | null; project: string | null; siteUrl: string | null };

/**
 * Sign-up controls. These are the Sign-ups engine's switch and email-verification rule (Admin → Engines),
 * shown here too with the Supabase checks that go with them. Each switch saves straight away.
 */
function AccountSettings({ settings, onChange }: { settings: Row; onChange: (v: Row) => void }) {
  const [info, setInfo] = useState<AuthStatus | null>(null);
  const [saving, setSaving] = useState("");
  useEffect(() => {
    adminApi<AuthStatus>("auth.status").then(setInfo).catch(() => {});
  }, []);
  const engine: EngineState = cleanEngine("signups", settings.engines?.signups);
  const s = { signupsOpen: engine.on, emailVerification: !!engine.params.emailVerification };

  const save = async (key: "signupsOpen" | "emailVerification", v: boolean, msg: string) => {
    setSaving(key);
    const state = key === "signupsOpen" ? { on: v } : { params: { emailVerification: v } };
    try {
      const r = await adminApi<{ engines: Row }>("engines.set", { key: "signups", state });
      onChange({ engines: r.engines });
      toast({ title: msg, tone: "success" });
    } catch (e) {
      toast({ title: "Couldn't save", body: (e as Error).message, tone: "error" });
    }
    setSaving("");
  };

  const dash = info?.project ? `https://supabase.com/dashboard/project/${info.project}` : null;
  const site = info?.siteUrl ?? (typeof window !== "undefined" ? window.location.origin : "");

  return (
    <div className="mt-4">
      <Panel title="Sign-up and sign-in">
        <div className="divide-y divide-hair">
          <SettingRow
            title="Allow new sign-ups"
            body="When off, nobody can create an account. Existing users can still sign in. Schedule it and limit business accounts under Engines → Sign-ups."
            control={<Toggle checked={!!s.signupsOpen} onChange={(v) => save("signupsOpen", v, v ? "Sign-ups opened" : "Sign-ups paused")} />}
            busy={saving === "signupsOpen"}
          />
          <SettingRow
            title="Require email verification"
            body="New accounts must click the link in a confirmation email before they can sign in. Turn it off to let people in straight after sign-up."
            control={<Toggle checked={!!s.emailVerification} onChange={(v) => save("emailVerification", v, v ? "Email verification required" : "Email verification turned off")} />}
            busy={saving === "emailVerification"}
          />
        </div>

        {info && (
          <div className="mt-3 space-y-2.5 border-t border-hair pt-4 text-[13px] leading-relaxed">
            {!info.ready && (
              <Note tone="warn">The email sign-in database update hasn&apos;t been applied yet, so nobody can sign up or sign in. Use the banner at the top of this page.</Note>
            )}
            {s.emailVerification && info.autoconfirm === true && (
              <Note tone="warn">
                Supabase is confirming new emails automatically, so no confirmation email is sent and new accounts get in straight away. To enforce verification,
                turn on <b>Confirm email</b> in Supabase → Authentication → Sign In / Providers → Email.
                {dash && (
                  <a href={`${dash}/auth/providers`} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-1 font-medium text-link">
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </Note>
            )}
            {s.emailVerification && info.autoconfirm === false && (
              <Note tone="ok">Supabase sends the confirmation emails. Verification is enforced.</Note>
            )}
            <Note tone="info">
              Supabase&apos;s built-in email service only delivers to your Supabase team members, a few per hour. Before launch, add your own email provider in
              Supabase → Authentication → Emails → SMTP Settings, and add <code className="rounded bg-mist px-1">{site}/auth/*</code> under Authentication → URL Configuration → Redirect URLs.
            </Note>
          </div>
        )}
      </Panel>
    </div>
  );
}

function SettingRow({ title, body, control, busy }: { title: string; body: string; control: ReactNode; busy?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-[15px] font-medium">{title}</div>
        <p className="mt-0.5 max-w-xl text-[13px] text-mute">{body}</p>
      </div>
      <div className={cn("shrink-0 pt-0.5 transition-opacity", busy && "pointer-events-none opacity-50")}>{control}</div>
    </div>
  );
}

function Note({ tone, children }: { tone: "ok" | "warn" | "info"; children: ReactNode }) {
  const Icon = tone === "ok" ? MailCheck : tone === "warn" ? TriangleAlert : Info;
  return (
    <p className="flex gap-2.5 text-ink-2">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone === "ok" ? "text-brand" : tone === "warn" ? "text-gold" : "text-mute")} />
      <span>{children}</span>
    </p>
  );
}

function SettingsScreen() {
  const [s, setS] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    adminApi<{ settings: Row }>("settings.get").then((r) => setS(r.settings));
  }, []);
  if (!s) return <PageHead title="Settings" sub="Loading…" />;
  return (
    <>
      <PageHead
        title="Settings"
        sub={<>Platform-wide controls. Changes apply to every user within about 20 seconds. Feature switches, schedules, prices and the site announcement are under <Link href="/admin/engines" className="text-link hover:underline">Engines</Link>.</>}
      />
      <DataPipeline />
      <AccountSettings settings={s} onChange={(v) => setS({ ...s, ...v })} />
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Marketplace">
          <div className="space-y-5">
            <Field label="Platform fee (%)" hint="Charged on payouts to businesses.">
              <Input type="number" min={0} max={20} step={0.1} value={s.feePercent} onChange={(e) => setS({ ...s, feePercent: e.target.value })} className="max-w-[160px]" />
            </Field>
            <Button
              loading={busy}
              onClick={async () => {
                setBusy(true);
                await mutate("settings.set", { settings: { feePercent: Number(s.feePercent) } }, "Settings saved");
                setBusy(false);
              }}
            >
              Save changes
            </Button>
          </div>
        </Panel>
        <Admins />
      </div>
    </>
  );
}

/* ───────────────────────────── Data pipeline ───────────────────────────── */

type Split = { stock: number; live: number };
type PipelineInfo = { mode: DataMode; counts: Record<"businesses" | "cars" | "parts" | "vehicles" | "users", Split> };

const PIPELINES: { id: DataMode; title: string; icon: typeof Database; body: string }[] = [
  {
    id: "stock",
    title: "Stock",
    icon: Database,
    body: "The built-in sample catalogue (demo dealers, cars, parts, rental fleet, pros, reviews and activity) plus anything real users add. Demo accounts work. Use it for demos and testing.",
  },
  {
    id: "live",
    title: "Live",
    icon: Radio,
    body: "Only real businesses, listings and activity. Sample data is hidden everywhere: on the marketplace, in dashboards and in this console's lists and stats. Demo accounts are signed out.",
  },
];

function DataPipeline() {
  const [info, setInfo] = useState<PipelineInfo | null>(null);
  const [busy, setBusy] = useState<DataMode | "seed" | null>(null);
  const setMode = usePipeline((s) => s.setMode);
  const load = () => adminApi<PipelineInfo>("pipeline").then((r) => (setInfo(r), setMode(r.mode))).catch(() => {});
  useEffect(() => void load(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = async (to: DataMode) => {
    if (!info || to === info.mode) return;
    const c = info.counts;
    const { ok } = await confirm({
      title: to === "live" ? "Switch to live data?" : "Switch back to stock data?",
      body:
        to === "live"
          ? `Shoppers will only see real data: ${c.cars.live} car listings, ${c.parts.live} parts, ${c.vehicles.live} rental vehicles and ${c.businesses.live} businesses. The sample catalogue and demo accounts are hidden, and nothing is deleted.`
          : `The sample catalogue comes back alongside real data: ${c.cars.stock} demo cars, ${c.parts.stock} parts, ${c.vehicles.stock} vehicles and ${c.businesses.stock} businesses. Demo accounts work again.`,
      action: to === "live" ? "Go live" : "Use stock data",
      danger: true,
    });
    if (!ok) return;
    setBusy(to);
    if (await mutate("settings.set", { settings: { dataMode: to } }, to === "live" ? "The marketplace is on live data" : "The marketplace is on stock data")) await load();
    setBusy(null);
  };

  const seed = async () => {
    setBusy("seed");
    if (await mutate("seed", {}, "Sample catalogue loaded")) await load();
    setBusy(null);
  };

  return (
    <div id="pipeline" className="scroll-mt-24">
      <Panel
        title="Data pipeline"
        action={<span className="text-[12px] text-faint">Applies to the whole system</span>}
      >
        <p className="-mt-1 mb-5 max-w-2xl text-[14px] leading-relaxed text-mute">
          Choose where the marketplace gets its data. Switching only changes what is shown; nothing is deleted, and you can switch back at any time.
        </p>
        <div role="radiogroup" aria-label="Data pipeline" className="grid gap-3 md:grid-cols-2">
          {PIPELINES.map((p) => {
            const active = info?.mode === p.id;
            const side = p.id;
            const c = info?.counts;
            const empty = side === "stock" && c && c.cars.stock + c.parts.stock + c.vehicles.stock === 0;
            return (
              <div
                key={p.id}
                role="radio"
                aria-checked={active}
                tabIndex={0}
                onClick={() => pick(p.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick(p.id))}
                className={cn(
                  "relative cursor-pointer rounded-[20px] p-5 text-left outline-none ring-1 transition focus-visible:ring-2 focus-visible:ring-link",
                  active ? "bg-white ring-2 ring-brand shadow-card" : "bg-mist/60 ring-hair hover:bg-mist",
                  !info && "pointer-events-none opacity-60",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn("grid h-10 w-10 place-items-center rounded-xl", active ? "bg-brand text-white" : "bg-white text-mute ring-1 ring-hair")}>
                    <p.icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <div className="flex-1 text-[17px] font-semibold tracking-tight">{p.title}</div>
                  {active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[12px] font-semibold text-brand">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} /> In use
                    </span>
                  ) : busy === p.id ? (
                    <span className="text-[12px] text-faint">Switching…</span>
                  ) : (
                    <span className="text-[12px] font-medium text-link">Switch</span>
                  )}
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-mute">{p.body}</p>
                <dl className="mt-4 grid grid-cols-4 gap-2 border-t border-hair pt-4">
                  {(["cars", "parts", "vehicles", "businesses"] as const).map((k) => (
                    <div key={k}>
                      <dt className="text-[11px] text-faint">{{ cars: "Cars", parts: "Parts", vehicles: "Fleet", businesses: "Businesses" }[k]}</dt>
                      <dd className="text-[17px] font-semibold tabular-nums">
                        {c ? (side === "stock" ? c[k].stock + c[k].live : c[k].live).toLocaleString() : "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-[11px] text-faint">{side === "stock" ? "Sample and real records combined" : "Real records only"}</p>
                {empty && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    loading={busy === "seed"}
                    onClick={(e) => {
                      e.stopPropagation();
                      seed();
                    }}
                  >
                    Load the sample catalogue
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function Admins() {
  const [list, setList] = useState<Row[] | null>(null);
  const [nu, setNu] = useState({ email: "", password: "" });
  const [pw, setPw] = useState("");
  const load = () => adminApi<{ admins: Row[] }>("admins.list").then((r) => setList(r.admins));
  useEffect(() => void load(), []);
  return (
    <Panel title="Administrators">
      <ul className="divide-y divide-hair">
        {(list ?? []).map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <Avatar name={a.email} hue={210} size={32} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium">{a.email} {a.me && <span className="text-faint">(you)</span>}</div>
              <div className="text-[12px] text-faint">{a.lastSignIn ? `Last sign-in ${ago(a.lastSignIn)}` : "Never signed in"}</div>
            </div>
            {!a.me && (
              <RowBtn
                tone="danger"
                onClick={async () => {
                  const r = await confirm({ title: `Remove admin access for ${a.email}?`, action: "Remove", danger: true });
                  if (r.ok && (await mutate("admins.revoke", { id: a.id }, "Admin access removed"))) load();
                }}
              >
                Remove
              </RowBtn>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-5 space-y-3 border-t border-hair pt-5">
        <div className="text-[14px] font-semibold">Add an administrator</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input type="email" placeholder="Email" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} />
          <Input type="password" placeholder="Temporary password (12+ chars)" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
        </div>
        <Button variant="secondary" disabled={!nu.email || nu.password.length < 12} onClick={async () => (await mutate("admins.create", nu, "Administrator added")) && (setNu({ email: "", password: "" }), load())}>
          Add administrator
        </Button>
      </div>
      <div className="mt-5 space-y-3 border-t border-hair pt-5">
        <div className="text-[14px] font-semibold">Change your password</div>
        <div className="flex gap-2">
          <Input type="password" placeholder="New password (12+ chars)" value={pw} onChange={(e) => setPw(e.target.value)} />
          <Button variant="secondary" disabled={pw.length < 12} onClick={async () => (await mutate("admins.password", { password: pw }, "Password changed")) && setPw("")}>Update</Button>
        </div>
      </div>
    </Panel>
  );
}

function Audit() {
  const [open, setOpen] = useState<Row | null>(null);
  return (
    <>
      <PageHead title="Audit log" sub="Every admin action and key marketplace event, newest first." />
      <EntityTable
        entity="audit"
        searchPlaceholder="Search actor, action or record"
        onOpen={(r) => setOpen(r)}
        columns={[
          { key: "created_at", label: "When", render: (r) => <span className="whitespace-nowrap">{new Date(r.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</span> },
          { key: "actor", label: "Actor", render: (r) => <span className={cn(r.actor.startsWith("admin") && "font-medium")}>{r.actor}</span> },
          { key: "action", label: "Action", render: (r) => <Mono>{r.action}</Mono> },
          { key: "entity_id", label: "Record", render: (r) => <span className="max-w-[220px] truncate">{r.entity_id ?? r.entity}</span> },
          { key: "detail", label: "Reason", render: (r) => <span className="max-w-[220px] truncate text-mute">{r.detail?.reason ?? ""}</span> },
        ]}
      />
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.action}>
        {open && <JsonView value={open} />}
      </Sheet>
    </>
  );
}


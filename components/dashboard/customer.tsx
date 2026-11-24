"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CarFront, ClipboardList, Cog, Heart, KeyRound, MessageSquare, Package, Plus, Search, ShieldCheck, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { getBusiness, getEngine, orderStatus, useAllCars, useDB, type LeadStage, type Order, type PartRequest } from "@/lib/db";
import { getSeller } from "@/lib/data/cars";
import { useApp, toast, type User } from "@/lib/store";
import { paused } from "@/lib/gate";
import { cn, img, naira, nairaShort } from "@/lib/utils";
import { Button, Field, Img, Input, Select, Sheet } from "../ui";
import { CarCard } from "../cards";
import { greeting } from "./dealer";
import { ORDER_TONE, Stepper } from "./parts";
import { BOOKING_TONE } from "./rental";
import { Empty, PageHead, Panel, PanelLink, Stat, Status, Tabs, fmtDate, timeAgo, type Tone } from "./kit";
import { ORDER_FLOW } from "@/lib/db";

const STATES = ["Lagos", "FCT Abuja", "Rivers", "Oyo", "Enugu", "Anambra", "Kano", "Delta", "Edo", "Kaduna", "Ogun"];

/** How a lead looks from the buyer's side. */
const BUYER_STAGE: Record<LeadStage, { tone: Tone; label: string }> = {
  new: { tone: "info", label: "Sent to seller" },
  contacted: { tone: "info", label: "Seller replied" },
  viewing: { tone: "warning", label: "Viewing booked" },
  negotiating: { tone: "warning", label: "Negotiating" },
  won: { tone: "good", label: "Accepted" },
  lost: { tone: "neutral", label: "Closed" },
};

function useCustomer() {
  const user = useApp((s) => s.user)!;
  const phone = user.phone;
  const orders = useDB((s) => s.orders);
  const bookings = useDB((s) => s.bookings);
  const leads = useDB((s) => s.leads);
  const requests = useDB((s) => s.requests);
  const threads = useDB((s) => s.threads);
  const inspections = useDB((s) => s.inspections);
  return useMemo(() => {
    const mine = <T extends { customer: { phone: string } }>(xs: T[]) => xs.filter((x) => x.customer.phone === phone);
    return {
      user,
      orders: mine(orders).sort((a, b) => b.at - a.at),
      bookings: mine(bookings).sort((a, b) => a.from.localeCompare(b.from)),
      leads: mine(leads).sort((a, b) => b.at - a.at),
      requests: mine(requests).sort((a, b) => b.at - a.at),
      threads: mine(threads),
      inspections: mine(inspections),
    };
  }, [user, phone, orders, bookings, leads, requests, threads, inspections]);
}

/* --------------------------------- Overview -------------------------------- */

export function CustomerOverview() {
  const { user, orders, bookings, leads, requests, threads } = useCustomer();
  const cars = useAllCars();
  const t = new Date().toISOString().slice(0, 10);
  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(orderStatus(o)));
  const upcoming = bookings.filter((b) => (b.status === "confirmed" || b.status === "pending" || b.status === "active") && b.to >= t);
  const quotes = requests.filter((r) => r.status === "open").reduce((a, r) => a + r.quotes.length, 0);
  const unread = threads.reduce((a, x) => a + x.unreadCust, 0);
  const myListings = cars.filter((c) => c.sellerId === `u:${user.phone}`);
  const track = activeOrders[0];
  const next = upcoming[0];

  return (
    <>
      <PageHead title={`Good ${greeting()}, ${user.name.split(" ")[0]}.`} sub="Everything you're buying, booking and selling on Naija Auto." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Orders in progress" value={activeOrders.length} hint={`${orders.length} all time`} icon={Package} />
        <Stat label="Upcoming trips" value={upcoming.length} icon={KeyRound} />
        <Stat label="Quotes received" value={quotes} hint="on open part requests" icon={ClipboardList} />
        <Stat label="Unread messages" value={unread} icon={MessageSquare} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Track your order" action={<PanelLink href="/dashboard/orders">All orders</PanelLink>}>
          {track ? (
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[15px] font-semibold tracking-tight">{track.id}</div>
                  <div className="text-[13px] text-mute">{track.lines.length} {track.lines.length === 1 ? "item" : "items"} · {naira(track.total)} · {timeAgo(track.at)}</div>
                </div>
                <Status tone={ORDER_TONE[orderStatus(track)].tone}>{ORDER_TONE[orderStatus(track)].label}</Status>
              </div>
              <div className="mt-5">
                <Stepper step={ORDER_FLOW.indexOf(orderStatus(track))} />
              </div>
              <p className="mt-4 text-[13px] text-mute">{track.lines.map((l) => l.name).join(" · ")}</p>
            </div>
          ) : (
            <Empty icon={Package} title="No orders on the way" action={<Button href="/parts" variant="secondary">Shop parts</Button>} />
          )}
        </Panel>
        <Panel title="Next trip" action={<PanelLink href="/dashboard/bookings">Bookings</PanelLink>}>
          {next ? (
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-mist text-center leading-none">
                <div>
                  <div className="text-[11px] uppercase text-faint">{new Date(next.from).toLocaleDateString("en-NG", { month: "short" })}</div>
                  <div className="text-[22px] font-semibold">{new Date(next.from).getDate()}</div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-semibold tracking-tight">{next.vehicle}</div>
                <div className="truncate text-[13px] text-mute">
                  {getBusiness(next.companyId)?.name} · {next.days} {next.days === 1 ? "day" : "days"} · {next.city}
                </div>
                <div className="mt-2"><Status tone={BOOKING_TONE[next.status].tone}>{BOOKING_TONE[next.status].label}</Status></div>
              </div>
            </div>
          ) : (
            <Empty icon={KeyRound} title="No trips booked" action={<Button href="/rentals" variant="secondary">Rent a car</Button>} />
          )}
        </Panel>
      </div>

      <Panel title="Your offers & enquiries" className="mt-4" pad={false}>
        {leads.length === 0 ? (
          <Empty icon={Tag} title="No enquiries yet" body="Offers, chats and inspection bookings you make on cars show up here." action={<Button href="/cars" variant="secondary">Browse cars</Button>} />
        ) : (
          <ul className="divide-y divide-hair">
            {leads.slice(0, 5).map((l) => {
              const car = cars.find((c) => c.id === l.carId);
              const st = BUYER_STAGE[l.stage];
              return (
                <li key={l.id}>
                  <Link href={`/cars/${l.carId}`} className="flex items-center gap-3 px-6 py-3.5 transition hover:bg-mist/40">
                    {car && <Img src={img(car.img, 160, { h: 120 })} alt="" className="h-11 w-14 shrink-0 rounded-lg" />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium">{car ? `${car.year} ${car.make} ${car.model}` : "Listing"}</div>
                      <div className="truncate text-[12px] text-mute">
                        {l.kind === "offer" && l.amount ? `Offer ${nairaShort(l.amount)}` : l.kind === "inspection" ? "Inspection booked" : "Enquiry"} · {getSeller(l.businessId).name} · {timeAgo(l.at)}
                      </div>
                    </div>
                    <Status tone={st.tone}>{st.label}</Status>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {myListings.length > 0 && (
        <Panel title="Cars you're selling" className="mt-4" pad={false} action={<PanelLink href="/sell">List another</PanelLink>}>
          <ul className="divide-y divide-hair">
            {myListings.map((c) => (
              <li key={c.id}>
                <Link href={`/cars/${c.id}`} className="flex items-center gap-3 px-6 py-3.5 transition hover:bg-mist/40">
                  <Img src={img(c.img, 160, { h: 120 })} alt="" className="h-11 w-14 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium">{c.year} {c.make} {c.model}</div>
                    <div className="text-[12px] text-mute">{naira(c.price)} · {c.views} views</div>
                  </div>
                  <Status tone={c.status === "active" ? "good" : "neutral"}>{c.status === "active" ? "Live" : c.status === "sold" ? "Sold" : "Paused"}</Status>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { href: "/cars", icon: Search, label: "Find a car" },
          { href: "/parts", icon: Cog, label: "Shop parts" },
          { href: "/rentals", icon: KeyRound, label: "Rent a car" },
          { href: "/dashboard/requests", icon: ClipboardList, label: "Request a part" },
          { href: "/sell", icon: CarFront, label: "Sell your car" },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="group flex flex-col gap-3 rounded-[20px] bg-white p-4 shadow-card ring-1 ring-black/[0.03] transition hover:-translate-y-0.5">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-white">
              <a.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
            <span className="text-[14px] font-medium">{a.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

/* ---------------------------------- Orders --------------------------------- */

export function CustomerOrders() {
  const { orders } = useCustomer();
  return (
    <>
      <PageHead title="Orders" sub="Each seller ships separately." action={<Button href="/parts" variant="secondary">Shop parts</Button>} />
      {orders.length === 0 ? (
        <Panel><Empty icon={Package} title="No orders yet" action={<Button href="/parts">Shop parts</Button>} /></Panel>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => <OrderCard key={o.id} o={o} />)}
        </div>
      )}
    </>
  );
}

function OrderCard({ o }: { o: Order }) {
  const sellers = Object.keys(o.fulfil);
  const st = orderStatus(o);
  return (
    <Panel pad={false}>
      <div className="flex flex-wrap items-center gap-3 border-b border-hair px-5 py-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold tracking-tight">{o.id}</div>
          <div className="text-[12px] text-mute">{new Date(o.at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })} · {o.address}, {o.state}</div>
        </div>
        <span className="text-[16px] font-semibold tabular-nums">{naira(o.total)}</span>
        <Status tone={ORDER_TONE[st].tone}>{ORDER_TONE[st].label}</Status>
      </div>
      <div className="divide-y divide-hair">
        {sellers.map((sid) => {
          const s = o.fulfil[sid];
          const lines = o.lines.filter((l) => l.sellerId === sid);
          return (
            <div key={sid} className="grid gap-4 px-5 py-4 sm:px-6 md:grid-cols-[1fr_280px] md:items-center">
              <div>
                <Link href={`/store/${sid}`} className="text-[13px] font-medium text-link hover:underline">{getBusiness(sid)?.name ?? lines[0]?.sellerId}</Link>
                <ul className="mt-1 space-y-0.5">
                  {lines.map((l) => (
                    <li key={l.partId} className="flex justify-between gap-4 text-[14px]">
                      <span className="truncate"><span className="text-mute tabular-nums">{l.qty}×</span> {l.name}</span>
                      <span className="tabular-nums text-mute">{naira(l.price * l.qty)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Stepper step={ORDER_FLOW.indexOf(s)} />
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* --------------------------------- Bookings -------------------------------- */

export function CustomerBookings() {
  const { bookings, inspections } = useCustomer();
  const set = useDB((s) => s.setBooking);
  const cars = useAllCars();
  const [tab, setTab] = useState<"rentals" | "inspections">("rentals");
  return (
    <>
      <PageHead title="Bookings" sub="Rentals and pre-purchase inspections." action={<Button href="/rentals" variant="secondary">Rent a car</Button>} />
      <Tabs value={tab} onChange={setTab} items={[{ value: "rentals", label: "Rentals", count: bookings.length }, { value: "inspections", label: "Inspections", count: inspections.length }]} />
      {tab === "rentals" ? (
        bookings.length === 0 ? (
          <Panel><Empty icon={KeyRound} title="No rentals yet" action={<Button href="/rentals">Browse rentals</Button>} /></Panel>
        ) : (
          <Panel pad={false}>
            <ul className="divide-y divide-hair">
              <AnimatePresence initial={false}>
                {bookings.map((b) => {
                  const st = BOOKING_TONE[b.status];
                  const biz = getBusiness(b.companyId);
                  return (
                    <motion.li layout key={b.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-mist text-center leading-none">
                          <div>
                            <div className="text-[10px] uppercase text-faint">{new Date(b.from).toLocaleDateString("en-NG", { month: "short" })}</div>
                            <div className="text-[19px] font-semibold">{new Date(b.from).getDate()}</div>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[15px] font-semibold tracking-tight">{b.vehicle}</div>
                          <div className="truncate text-[13px] text-mute">
                            {biz ? <Link href={`/store/${biz.id}`} className="hover:underline">{biz.name}</Link> : "Rental company"} · {b.city}
                          </div>
                          <div className="text-[12px] text-faint">{fmtDate(b.from)} → {fmtDate(b.to)} · {b.driver ? "With chauffeur" : "Self-drive"} · {b.id}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="text-[15px] font-semibold tabular-nums">{naira(b.total)}</span>
                        <Status tone={st.tone}>{st.label}</Status>
                        {(b.status === "pending" || b.status === "confirmed") && (
                          <Button size="sm" variant="secondary" onClick={() => {
                            // Admin → Engines → Rentals: confirmed bookings can only be cancelled up to the cut-off.
                            const hours = Number(getEngine("rentals").params.cancelHours);
                            if (b.status === "confirmed" && Date.parse(`${b.from}T00:00:00+01:00`) - Date.now() < hours * 3600_000)
                              return toast({ title: "Too late to cancel here", body: `Confirmed bookings can be cancelled up to ${hours} hours before pickup. Contact the rental company.`, tone: "error" });
                            set(b.id, "cancelled");
                            toast({ title: "Booking cancelled", body: b.driver ? undefined : "Your deposit will be refunded within 24h." });
                          }}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </Panel>
        )
      ) : inspections.length === 0 ? (
        <Panel><Empty icon={ShieldCheck} title="No inspections booked" body="Book a 150-point inspection from any car's page." action={<Button href="/cars">Browse cars</Button>} /></Panel>
      ) : (
        <Panel pad={false}>
          <ul className="divide-y divide-hair">
            {inspections.map((i) => {
              const car = cars.find((c) => c.id === i.carId);
              return (
                <li key={i.id} className="flex items-center gap-3 px-6 py-4">
                  {car && <Img src={img(car.img, 160, { h: 120 })} alt="" className="h-11 w-14 shrink-0 rounded-lg" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium">{car ? `${car.year} ${car.make} ${car.model}` : "Car"}</div>
                    <div className="text-[13px] text-mute">{i.plan} inspection · {fmtDate(i.date)}, {i.slot}</div>
                  </div>
                  <span className="text-[14px] font-semibold tabular-nums">{naira(i.price)}</span>
                  <Status tone="info">Scheduled</Status>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </>
  );
}

/* --------------------------------- Requests -------------------------------- */

export function CustomerRequests() {
  const { user, requests } = useCustomer();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHead
        title="Part requests"
        sub="Can't find a part? Describe it once and verified sellers nationwide send you quotes."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New request</Button>}
      />
      {requests.length === 0 ? (
        <Panel><Empty icon={ClipboardList} title="No requests yet" body="Most requests get their first quote within an hour." action={<Button onClick={() => setOpen(true)}>Request a part</Button>} /></Panel>
      ) : (
        <div className="space-y-4">{requests.map((r) => <MyRequest key={r.id} r={r} user={user} />)}</div>
      )}
      <RequestSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function MyRequest({ r, user }: { r: PartRequest; user: User }) {
  const close = useDB((s) => s.closeRequest);
  const send = useDB((s) => s.send);
  const quotes = [...r.quotes].sort((a, b) => a.price - b.price);
  return (
    <Panel pad={false}>
      <div className="flex flex-wrap items-center gap-3 border-b border-hair px-5 py-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold tracking-tight">{r.part}</div>
          <div className="text-[13px] text-mute">{r.vehicle} · {r.state} · posted {timeAgo(r.at)}</div>
        </div>
        <Status tone={r.status === "open" ? (quotes.length ? "good" : "warning") : "neutral"}>
          {r.status === "closed" ? "Closed" : quotes.length ? `${quotes.length} ${quotes.length === 1 ? "quote" : "quotes"}` : "Waiting for quotes"}
        </Status>
      </div>
      {quotes.length === 0 ? (
        <p className="px-6 py-5 text-[14px] text-mute">Sellers have been notified. You&apos;ll see quotes here and in Messages.</p>
      ) : (
        <ul className="divide-y divide-hair">
          {quotes.map((q, i) => {
            const b = getBusiness(q.businessId);
            return (
              <li key={q.businessId} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[14px] font-medium">
                    {b ? <Link href={`/store/${b.id}`} className="hover:underline">{b.name}</Link> : "Seller"}
                    {i === 0 && quotes.length > 1 && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">Best price</span>}
                  </div>
                  {q.note && <div className="text-[13px] text-mute">{q.note}</div>}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-[17px] font-semibold tabular-nums">{naira(q.price)}</span>
                  {r.status === "open" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        close(r.id);
                        send({ businessId: q.businessId, customer: { name: user.name, phone: user.phone }, topic: { kind: "request", id: r.id, title: r.part }, from: "customer", text: `I'd like to go ahead with your quote of ${naira(q.price)} for the ${r.part}. How do I pay?` });
                        toast({ title: "Quote accepted", body: `${b?.name ?? "The seller"} will message you to arrange payment and delivery.`, tone: "success" });
                      }}
                    >
                      Accept
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/** Also used from the Parts store. */
export function RequestSheet({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: string }) {
  const user = useApp((s) => s.user);
  const post = useDB((s) => s.postRequest);
  const [f, setF] = useState({ part: initial ?? "", vehicle: "", state: "Lagos", note: "" });
  const valid = f.part.trim().length > 2 && f.vehicle.trim().length > 2;
  return (
    <Sheet open={open} onClose={onClose} title="Request a part">
      <div className="space-y-4 pb-2">
        <p className="text-[14px] text-mute">Verified parts sellers will quote you. Compare prices and accept the best one — no obligation.</p>
        <Field label="What do you need?">
          <Input placeholder="e.g. Front shock absorbers (pair)" value={f.part} onChange={(e) => setF({ ...f, part: e.target.value })} />
        </Field>
        <Field label="Your car">
          <Input placeholder="e.g. Toyota Corolla 2014" value={f.vehicle} onChange={(e) => setF({ ...f, vehicle: e.target.value })} />
        </Field>
        <Field label="Deliver to">
          <Select value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })}>
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Notes" hint="Optional — brand, condition, VIN, urgency">
          <Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
        <Button
          size="lg"
          className="w-full"
          disabled={!valid || !user}
          onClick={() => {
            if (!user || paused("partRequests")) return;
            // Admin → Engines → Part requests: limit on open requests per shopper (the server checks too).
            const max = Number(getEngine("partRequests").params.maxOpen);
            const open = useDB.getState().requests.filter((r) => r.status === "open" && r.customer.phone === user.phone).length;
            if (max > 0 && open >= max) return toast({ title: "Too many open requests", body: `You can have ${max} open at a time. Close one you no longer need first.`, tone: "error" });
            post({ customer: { name: user.name, phone: user.phone }, part: f.part.trim(), vehicle: f.vehicle.trim(), state: f.state, note: f.note.trim() });
            toast({ title: "Request posted", body: "Sellers have been notified. Track quotes in your dashboard.", tone: "success" });
            setF({ part: "", vehicle: "", state: "Lagos", note: "" });
            onClose();
          }}
        >
          Post request
        </Button>
      </div>
    </Sheet>
  );
}

/* ----------------------------------- Saved ---------------------------------- */

export function CustomerSaved() {
  const saved = useApp((s) => s.saved);
  const all = useAllCars();
  const cars = saved.map((id) => all.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c);
  return (
    <>
      <PageHead title="Saved" sub="Cars you love. We'll tell you if the price drops." />
      {cars.length === 0 ? (
        <Panel><Empty icon={Heart} title="Nothing saved yet" body="Tap the heart on any car to keep it here." action={<Button href="/cars">Browse cars</Button>} /></Panel>
      ) : (
        <div className={cn("grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3")}>
          {cars.map((c) => <CarCard key={c.id} car={c} />)}
        </div>
      )}
    </>
  );
}



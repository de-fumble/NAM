"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Check, ImagePlus, KeyRound, Plus, TrendingUp, Users, Wrench, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useAllFleet, useDB, type Booking, type BookingStatus } from "@/lib/db";
import { compressImage } from "@/lib/files";
import { IMG } from "@/lib/data/images";
import type { Rental } from "@/lib/data/rentals";
import { useApp, toast } from "@/lib/store";
import { cn, img, naira, nairaShort } from "@/lib/utils";
import { Avatar, Button, Field, Img, Input, Select, Sheet, Toggle } from "../ui";
import { IconBtn, greeting } from "./dealer";
import { AreaChart, Empty, Meter, PageHead, Panel, PanelLink, Stat, Status, Tabs, fmtDate, series, timeAgo, type Tone } from "./kit";

export const BOOKING_TONE: Record<BookingStatus, { tone: Tone; label: string }> = {
  pending: { tone: "warning", label: "Awaiting approval" },
  confirmed: { tone: "info", label: "Confirmed" },
  active: { tone: "good", label: "On trip" },
  completed: { tone: "neutral", label: "Completed" },
  declined: { tone: "critical", label: "Declined" },
  cancelled: { tone: "critical", label: "Cancelled" },
};

function useRental() {
  const user = useApp((s) => s.user)!;
  const id = user.businessId!;
  const allFleet = useAllFleet();
  const bookings = useDB((s) => s.bookings);
  const fleet = useMemo(() => allFleet.filter((r) => r.companyId === id), [allFleet, id]);
  const mine = useMemo(() => bookings.filter((b) => b.companyId === id).sort((a, b) => a.from.localeCompare(b.from)), [bookings, id]);
  return { id, fleet, bookings: mine };
}

const today = () => new Date().toISOString().slice(0, 10);

/* --------------------------------- Overview -------------------------------- */

export function RentalOverview() {
  const { id, fleet, bookings } = useRental();
  const t = today();
  const onTrip = bookings.filter((b) => b.status === "active" || (b.status === "confirmed" && b.from <= t && b.to > t));
  const pending = bookings.filter((b) => b.status === "pending");
  const upcoming = bookings.filter((b) => b.status === "confirmed" && b.from >= t).slice(0, 4);
  const util = fleet.length ? new Set(onTrip.map((b) => b.rentalId)).size / fleet.length : 0;
  const revenue = useMemo(() => series(`${id}-rev`, 30, 420_000, 380_000), [id]);
  const cats = Array.from(new Set(fleet.map((f) => f.category)));

  return (
    <>
      <PageHead
        title={`Good ${greeting()}.`}
        sub={`${onTrip.length} on trip today · ${pending.length} ${pending.length === 1 ? "request needs" : "requests need"} your approval.`}
        action={<Button href="/dashboard/fleet"><Plus className="h-4 w-4" /> Add vehicle</Button>}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Fleet" value={fleet.length} hint={`${fleet.filter((f) => f.status === "maintenance").length} in maintenance`} icon={KeyRound} />
        <Stat label="Utilisation today" value={`${Math.round(util * 100)}%`} delta={6} icon={TrendingUp} />
        <Stat label="Pending requests" value={pending.length} hint="respond within 2h" icon={CalendarDays} />
        <Stat label="Revenue · 30 days" value={nairaShort(revenue.reduce((a, d) => a + d.value, 0))} delta={11} icon={TrendingUp} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Daily revenue" action={<span className="text-[12px] text-faint">Last 30 days</span>}>
          <AreaChart data={revenue} format={nairaShort} />
        </Panel>
        <Panel title="Needs approval" action={<PanelLink href="/dashboard/bookings">All bookings</PanelLink>} pad={false}>
          {pending.length === 0 ? <Empty icon={Check} title="You're all caught up" /> : <ul className="divide-y divide-hair">{pending.map((b) => <PendingRow key={b.id} b={b} />)}</ul>}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Upcoming pickups">
          {upcoming.length === 0 ? (
            <p className="text-[14px] text-mute">No confirmed pickups yet.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((b) => (
                <li key={b.id} className="flex items-center gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-mist text-center leading-none">
                    <div>
                      <div className="text-[10px] uppercase text-faint">{new Date(b.from).toLocaleDateString("en-NG", { month: "short" })}</div>
                      <div className="text-[17px] font-semibold">{new Date(b.from).getDate()}</div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium">{b.vehicle}</div>
                    <div className="truncate text-[12px] text-mute">{b.customer.name} · {b.days} {b.days === 1 ? "day" : "days"} · {b.driver ? "chauffeur" : "self-drive"}</div>
                  </div>
                  <span className="text-[14px] font-semibold tabular-nums">{nairaShort(b.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Utilisation by category">
          <div className="space-y-5">
            {cats.map((c) => {
              const ids = fleet.filter((f) => f.category === c).map((f) => f.id);
              const busy = new Set(bookings.filter((b) => ids.includes(b.rentalId) && b.status !== "declined" && b.status !== "cancelled").map((b) => b.rentalId)).size;
              return <Meter key={c} label={c} value={ids.length ? busy / ids.length : 0} sub={`${busy} of ${ids.length} ${ids.length === 1 ? "vehicle" : "vehicles"} booked in the next two weeks`} />;
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}

function PendingRow({ b }: { b: Booking }) {
  const set = useDB((s) => s.setBooking);
  return (
    <li className="flex items-center gap-3 px-6 py-3.5">
      <Avatar name={b.customer.name} hue={b.customer.name.length * 31} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium">{b.vehicle}</div>
        <div className="truncate text-[12px] text-mute">
          {b.customer.name} · {fmtDate(b.from)} · {b.days}d · {nairaShort(b.total)}
        </div>
      </div>
      <IconBtn label="Decline" onClick={() => { set(b.id, "declined"); toast({ title: "Booking declined" }); }} className="hover:text-[#b3261e]">
        <X className="h-4 w-4" />
      </IconBtn>
      <IconBtn label="Approve" onClick={() => { set(b.id, "confirmed"); toast({ title: "Booking confirmed", body: `${b.customer.name} has been notified.`, tone: "success" }); }} className="bg-ink text-white hover:bg-black hover:text-white">
        <Check className="h-4 w-4" />
      </IconBtn>
    </li>
  );
}

/* --------------------------------- Bookings -------------------------------- */

export function RentalBookings() {
  const { fleet, bookings } = useRental();
  const set = useDB((s) => s.setBooking);
  const [tab, setTab] = useState<BookingStatus | "all">("pending");
  const list = tab === "all" ? bookings : bookings.filter((b) => b.status === tab);
  const count = (s: BookingStatus) => bookings.filter((b) => b.status === s).length;

  return (
    <>
      <PageHead title="Bookings" sub="Approve requests, start trips and close them out." />
      <FleetCalendar fleet={fleet} bookings={bookings} />
      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "pending", label: "Requests", count: count("pending") },
            { value: "confirmed", label: "Upcoming", count: count("confirmed") },
            { value: "active", label: "On trip", count: count("active") },
            { value: "completed", label: "Completed", count: count("completed") },
            { value: "all", label: "All", count: bookings.length },
          ]}
        />
      </div>
      <Panel pad={false}>
        {list.length === 0 ? (
          <Empty icon={CalendarDays} title="No bookings here" />
        ) : (
          <ul className="divide-y divide-hair">
            <AnimatePresence initial={false}>
              {list.map((b) => {
                const st = BOOKING_TONE[b.status];
                return (
                  <motion.li key={b.id} layout exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={b.customer.name} hue={b.customer.name.length * 31} size={40} />
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-semibold tracking-tight">{b.vehicle}</div>
                        <div className="truncate text-[13px] text-mute">
                          {b.customer.name} · {b.customer.phone}
                        </div>
                        <div className="text-[12px] text-faint">
                          {fmtDate(b.from)} → {fmtDate(b.to)} · {b.days}d · {b.driver ? "Chauffeur" : "Self-drive"} · {b.id}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="text-[15px] font-semibold tabular-nums">{naira(b.total)}</span>
                      <Status tone={st.tone}>{st.label}</Status>
                      {b.status === "pending" && (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => set(b.id, "declined")}>Decline</Button>
                          <Button size="sm" onClick={() => { set(b.id, "confirmed"); toast({ title: "Booking confirmed", tone: "success" }); }}>Approve</Button>
                        </>
                      )}
                      {b.status === "confirmed" && <Button size="sm" onClick={() => set(b.id, "active")}>Start trip</Button>}
                      {b.status === "active" && <Button size="sm" variant="brand" onClick={() => { set(b.id, "completed"); toast({ title: "Trip completed", body: "The car is back with you.", tone: "success" }); }}>Complete</Button>}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </Panel>
    </>
  );
}

/** 14-day availability grid: one row per vehicle, bars for bookings. */
function FleetCalendar({ fleet, bookings }: { fleet: (Rental & { status: string })[]; bookings: Booking[] }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 14 }, (_, i) => new Date(start.getTime() + i * 86_400_000));
  const idx = (iso: string) => Math.round((new Date(iso).setHours(0, 0, 0, 0) - start.getTime()) / 86_400_000);
  return (
    <Panel title="Next 14 days" pad={false}>
      <div className="overflow-x-auto px-6 pb-6">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[180px_repeat(14,1fr)] border-b border-hair pb-2 text-center text-[11px] text-faint">
            <div />
            {days.map((d, i) => (
              <div key={i} className={cn(i === 0 && "font-semibold text-ink")}>
                <div>{d.toLocaleDateString("en-NG", { weekday: "narrow" })}</div>
                <div className="tabular-nums">{d.getDate()}</div>
              </div>
            ))}
          </div>
          {fleet.map((v) => {
            const bs = bookings.filter((b) => b.rentalId === v.id && ["pending", "confirmed", "active"].includes(b.status));
            return (
              <div key={v.id} className="relative grid h-12 grid-cols-[180px_repeat(14,1fr)] items-center border-b border-hair last:border-0">
                <div className="flex items-center gap-2 truncate pr-3 text-[13px] font-medium">
                  {v.status === "maintenance" && <Wrench className="h-3.5 w-3.5 shrink-0 text-[#a8430f]" aria-label="In maintenance" />}
                  <span className="truncate">{v.name}</span>
                </div>
                {days.map((_, i) => (
                  <div key={i} className={cn("h-full border-l border-hair/60", (days[i].getDay() === 0 || days[i].getDay() === 6) && "bg-mist/50")} />
                ))}
                {bs.map((b) => {
                  const a = Math.max(0, idx(b.from));
                  const z = Math.min(14, idx(b.to));
                  if (z <= 0 || a >= 14) return null;
                  const pending = b.status === "pending";
                  return (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, scaleX: 0.6 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      style={{ left: `calc(180px + (100% - 180px) * ${a / 14} + 2px)`, width: `calc((100% - 180px) * ${(z - a) / 14} - 4px)`, originX: 0 }}
                      className={cn(
                        "absolute top-2 flex h-8 items-center truncate rounded-lg px-2 text-[11px] font-semibold",
                        pending ? "border border-dashed border-[#8a5a00] bg-[#fff4d6] text-[#8a5a00]" : "bg-brand text-white",
                      )}
                      title={`${b.customer.name} · ${BOOKING_TONE[b.status].label}`}
                    >
                      {pending ? "Pending · " : ""}
                      {b.customer.name.split(" ")[0]}
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

/* ---------------------------------- Fleet ---------------------------------- */

export function RentalFleet() {
  const { id, fleet, bookings } = useRental();
  const patch = useDB((s) => s.patchVehicle);
  const [adding, setAdding] = useState(false);
  return (
    <>
      <PageHead title="Fleet" sub="Set daily rates and availability. Vehicles in maintenance are hidden from renters." action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add vehicle</Button>} />
      {fleet.length === 0 ? (
        <Panel>
          <Empty icon={KeyRound} title="No vehicles yet" body="Add your first vehicle to start receiving bookings." action={<Button onClick={() => setAdding(true)}>Add vehicle</Button>} />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {fleet.map((v) => {
            const trips = bookings.filter((b) => b.rentalId === v.id && b.status === "completed").length;
            return (
              <Panel key={v.id} pad={false} className="overflow-hidden">
                <div className="relative">
                  <Img src={img(v.img, 700, { h: 420 })} alt={v.name} className={cn("aspect-[5/3]", v.status === "maintenance" && "grayscale")} />
                  <div className="absolute left-3 top-3">
                    <Status tone={v.status === "available" ? "good" : v.status === "removed" ? "critical" : "serious"}>{v.status === "available" ? "Available" : v.status === "removed" ? "Removed by admin" : "Maintenance"}</Status>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-[17px] font-semibold tracking-tight">{v.name}</h3>
                      <div className="mt-0.5 flex items-center gap-2 text-[12px] text-mute">
                        <Users className="h-3.5 w-3.5" /> {v.seats} seats · {v.category} · {trips} trips
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[13px] text-mute">Daily rate</span>
                    <div className="relative ml-auto">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-mute">₦</span>
                      <input
                        defaultValue={v.daily.toLocaleString("en-NG")}
                        onBlur={(e) => {
                          const n = Number(e.target.value.replace(/\D/g, ""));
                          if (n > 0 && n !== v.daily) {
                            patch(v.id, { daily: n });
                            toast({ title: "Rate updated", body: `${v.name}: ${naira(n)}/day`, tone: "success" });
                          }
                        }}
                        className="h-9 w-32 rounded-lg border border-line pl-6 pr-2 text-right text-[14px] font-semibold tabular-nums outline-none focus:border-link"
                        aria-label={`Daily rate for ${v.name}`}
                      />
                    </div>
                  </div>
                  <div className={cn("mt-2", v.status === "removed" && "pointer-events-none opacity-40")}>
                    <Toggle checked={v.status === "available"} onChange={(on) => patch(v.id, { status: on ? "available" : "maintenance" })} label={<span className="text-[14px]">Available for booking</span>} />
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
      <AddVehicle open={adding} onClose={() => setAdding(false)} companyId={id} />
    </>
  );
}

function AddVehicle({ open, onClose, companyId }: { open: boolean; onClose: () => void; companyId: string }) {
  const add = useDB((s) => s.addVehicle);
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ name: "", category: "Everyday" as Rental["category"], daily: "", seats: "5", selfDrive: true, city: "Lagos", photo: "" });
  const valid = f.name.trim() && Number(f.daily) > 0;
  return (
    <Sheet open={open} onClose={onClose} title="Add a vehicle">
      <div className="space-y-4 pb-2">
        <button onClick={() => fileRef.current?.click()} className="relative block aspect-[5/3] w-full overflow-hidden rounded-2xl border-2 border-dashed border-line bg-mist/50 transition hover:border-ink/40">
          {f.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full flex-col items-center justify-center text-[14px] text-mute">
              <ImagePlus className="mb-2 h-7 w-7" strokeWidth={1.5} /> Add a photo
            </span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => e.target.files?.[0] && setF({ ...f, photo: await compressImage(e.target.files[0]) })} />
        <Field label="Vehicle">
          <Input placeholder="e.g. Toyota Prado 2021" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Rental["category"] })}>
              {["Everyday", "SUV", "Executive", "Wedding & Events", "Bus"].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Seats">
            <Input inputMode="numeric" value={f.seats} onChange={(e) => setF({ ...f, seats: e.target.value.replace(/\D/g, "") })} />
          </Field>
          <Field label="Daily rate (₦)">
            <Input inputMode="numeric" value={f.daily ? Number(f.daily).toLocaleString() : ""} onChange={(e) => setF({ ...f, daily: e.target.value.replace(/\D/g, "") })} />
          </Field>
          <Field label="City">
            <Select value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>
              {["Lagos", "FCT Abuja", "Rivers", "Enugu"].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <Toggle checked={f.selfDrive} onChange={(v) => setF({ ...f, selfDrive: v })} label="Allow self-drive" />
        <Button
          size="lg"
          className="w-full"
          disabled={!valid}
          onClick={() => {
            add({
              id: `r-${Date.now().toString(36)}`, companyId, name: f.name.trim(), category: f.category, img: f.photo || IMG.camry, daily: Number(f.daily), seats: Number(f.seats) || 5,
              withDriver: true, selfDrive: f.selfDrive, cities: [f.city], perks: ["New on Naija Auto"], rating: 5, trips: 0,
            });
            toast({ title: "Vehicle added", body: "It's now bookable on the Rentals page.", tone: "success" });
            setF({ name: "", category: "Everyday", daily: "", seats: "5", selfDrive: true, city: "Lagos", photo: "" });
            onClose();
          }}
        >
          Add to fleet
        </Button>
      </div>
    </Sheet>
  );
}


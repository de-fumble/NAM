"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleCheckBig, Star, UserRound, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { IMG } from "@/lib/data/images";
import { type Rental } from "@/lib/data/rentals";
import { getBusiness, useAllFleet, useBusinesses, useDB, useEngine, useSuspended } from "@/lib/db";
import { overlaps, rentalQuote } from "@/lib/engines";
import { act } from "@/lib/gate";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { cn, img, naira, nairaShort, sleep } from "@/lib/utils";
import { Badge, Button, Container, Field, Img, Input, Segmented, Select, Sheet, Toggle, easeApple } from "./ui";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (day: string, n: number) => iso(new Date(new Date(day).getTime() + n * 86400000));

export function Rentals() {
  const today = useMemo(() => new Date(), []);
  const [city, setCity] = useState("Lagos");
  const [from, setFrom] = useState(iso(new Date(today.getTime() + 86400000)));
  const [to, setTo] = useState(iso(new Date(today.getTime() + 3 * 86400000)));
  const [driver, setDriver] = useState(true);
  const [cat, setCat] = useState<"All" | Rental["category"]>("All");
  const [pick, setPick] = useState<Rental | null>(null);
  const days = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
  // Rules from Admin → Engines → Rentals.
  const { params: rules } = useEngine("rentals");
  const maxDays = Number(rules.maxDays);

  const fleet = useAllFleet();
  const busy = useDB((s) => s.fleetBusy);
  const suspended = useSuspended();
  const businesses = useBusinesses();
  const companyName = (id: string) => businesses.find((b) => b.id === id)?.name;
  const free = (id: string) => !rules.preventOverlap || !(busy?.[id] ?? []).some(([a, b]) => overlaps(from, to, a, b));
  const list = fleet.filter((r) => r.status === "available" && !suspended.has(r.companyId) && r.cities.includes(city) && (cat === "All" || r.category === cat) && (driver ? r.withDriver : r.selfDrive) && free(r.id));

  return (
    <div className="pt-[64px]">
      <section className="relative overflow-hidden bg-black text-white">
        <Img src={img(IMG.bmw7, 2200, { h: 1000 })} alt="" className="absolute inset-0 !bg-black" imgClassName="opacity-60" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
        <Container className="relative pb-10 pt-20 sm:pb-14 sm:pt-32">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: easeApple }}>
            <h1 className="headline max-w-2xl text-[40px] sm:text-[64px]">Rent a car. Arrive in style.</h1>
            <p className="mt-3 max-w-lg text-[17px] text-white/70 sm:text-[19px]">Self-drive or chauffeured — airport pickups, interstate trips, weddings and business travel.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: easeApple, delay: 0.15 }}
            className="mt-10 grid gap-3 rounded-[24px] bg-white p-4 text-ink shadow-float sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
          >
            <Field label="City">
              <Select value={city} onChange={(e) => setCity(e.target.value)}>
                {["Lagos", "FCT Abuja", "Rivers", "Enugu"].map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Pick-up">
              <Input type="date" value={from} min={iso(today)} onChange={(e) => { const f = e.target.value; setFrom(f); if (f >= to) setTo(addDays(f, 1)); else if (to > addDays(f, maxDays)) setTo(addDays(f, maxDays)); }} />
            </Field>
            <Field label="Return">
              <Input type="date" value={to} min={addDays(from, 1)} max={addDays(from, maxDays)} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <div className="flex h-12 items-center rounded-xl bg-mist px-4">
              <Toggle checked={driver} onChange={setDriver} label={<span className="mr-3 whitespace-nowrap text-[14px] font-medium">With driver</span>} />
            </div>
          </motion.div>
        </Container>
      </section>

      <Container className="pt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Segmented size="sm" value={cat} onChange={setCat} className="no-scrollbar max-w-full overflow-x-auto" options={(["All", "Everyday", "SUV", "Executive", "Wedding & Events"] as const).map((c) => ({ value: c, label: c }))} />
          <span className="text-[14px] text-mute">{list.length} cars · {days} {days === 1 ? "day" : "days"}</span>
        </div>
        <motion.div layout className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((r) => {
              const daily = rentalQuote(r.daily, days, driver, r.selfDrive, rules).perDay;
              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.4, ease: easeApple }}
                  className="group overflow-hidden rounded-[26px] bg-white shadow-card ring-1 ring-black/[0.03]"
                >
                  <Img src={img(r.img, 900, { h: 600 })} alt={r.name} className="aspect-[3/2]" imgClassName="group-hover:scale-[1.04] !duration-[900ms]" />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge>{r.category}</Badge>
                        <h3 className="mt-2 text-[19px] font-semibold tracking-tight">{r.name}</h3>
                      </div>
                      <div className="flex items-center gap-1 text-[13px] text-mute">
                        <Star className="h-3.5 w-3.5 fill-[#ff9f0a] text-[#ff9f0a]" /> {r.rating}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-mute">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {r.seats} seats</span>
                      <span className="flex items-center gap-1"><UserRound className="h-3.5 w-3.5" /> {r.selfDrive ? (driver ? "Chauffeur" : "Self-drive") : "Chauffeur only"}</span>
                      <span>{r.trips.toLocaleString()} trips</span>
                    </div>
                    {companyName(r.companyId) && (
                      <Link href={`/store/${r.companyId}`} className="mt-1.5 block text-[13px] font-medium text-link hover:underline">
                        {companyName(r.companyId)}
                      </Link>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {r.perks.map((p) => <span key={p} className="rounded-full bg-mist px-2.5 py-1 text-[11px] font-medium text-ink-2">{p}</span>)}
                    </div>
                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <div className="text-[21px] font-semibold tabular-nums">{nairaShort(daily)}<span className="text-[13px] font-normal text-mute">/day</span></div>
                        <div className="text-[12px] text-faint">{naira(daily * days)} total</div>
                      </div>
                      <Button size="sm" className="h-9 px-4" onClick={() => act("rentals", () => setPick(r))}>Reserve</Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
        {list.length === 0 && (
          <div className="rounded-[28px] bg-white py-16 text-center shadow-card">
            <h3 className="text-[21px] font-semibold">Nothing available for that combo.</h3>
            <p className="mt-1 text-mute">Try another category, or toggle the driver option.</p>
          </div>
        )}
      </Container>

      <ReserveSheet rental={pick} onClose={() => setPick(null)} days={days} driver={driver} from={from} to={to} city={city} />
    </div>
  );
}

function ReserveSheet({ rental, onClose, days, driver, from, to, city }: { rental: Rental | null; onClose: () => void; days: number; driver: boolean; from: string; to: string; city: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [last, setLast] = useState<Rental | null>(null);
  useEffect(() => {
    if (rental) {
      setLast(rental);
      setDone(false);
    }
  }, [rental]);
  const { params: rules } = useEngine("rentals");
  const r = rental ?? last;
  if (!r) return null;
  const { fee, deposit, total: grand } = rentalQuote(r.daily, days, driver, r.selfDrive, rules);
  const total = grand - deposit;
  const cancelHours = Number(rules.cancelHours);
  const fmt = (s: string) => new Date(s).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
  return (
    <Sheet open={!!rental} onClose={onClose} title={done ? "" : "Review reservation"}>
      {done ? (
        <div className="flex flex-col items-center py-8 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 15 }}>
            <CircleCheckBig className="h-16 w-16 text-brand" strokeWidth={1.3} />
          </motion.div>
          <h3 className="mt-4 text-[24px] font-semibold tracking-tight">{rules.autoConfirm ? "Booking confirmed." : "Request sent."}</h3>
          <p className="mt-2 max-w-xs text-[15px] text-mute">
            {rules.autoConfirm ? "You're all set." : `${getBusiness(r.companyId)?.name ?? "The rental company"} usually confirms within 2 hours.`} {driver ? "Chauffeur details follow on confirmation." : "Bring your licence and ID at pickup."}
          </p>
          <div className="mt-6 flex gap-3">
            <Button href="/dashboard/bookings">View booking</Button>
            <Button variant="secondary" onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="pb-2">
          <Img src={img(r.img, 900, { h: 500 })} alt={r.name} className="aspect-[9/5] rounded-2xl" />
          <h3 className="mt-4 text-[21px] font-semibold tracking-tight">{r.name}</h3>
          <p className="text-[14px] text-mute">{city} · {fmt(from)} → {fmt(to)}</p>
          <dl className="mt-5 space-y-2.5 text-[15px]">
            <div className="flex justify-between"><dt className="text-mute">{naira(r.daily)} × {days} {days === 1 ? "day" : "days"}</dt><dd className="tabular-nums">{naira(r.daily * days)}</dd></div>
            {fee > 0 && <div className="flex justify-between"><dt className="text-mute">Chauffeur ({naira(fee)}/day)</dt><dd className="tabular-nums">{naira(fee * days)}</dd></div>}
            {deposit > 0 && <div className="flex justify-between"><dt className="text-mute">Refundable caution deposit</dt><dd className="tabular-nums">{naira(deposit)}</dd></div>}
            <div className={cn("flex justify-between border-t border-hair pt-3 text-[19px] font-semibold")}><dt>Total</dt><dd className="tabular-nums">{naira(total + deposit)}</dd></div>
          </dl>
          <p className="mt-3 text-[12px] text-faint">Fuel not included. {cancelHours > 0 ? `Free cancellation up to ${cancelHours} hours before pickup.` : "Free cancellation until pickup."}</p>
          <Button
            size="lg"
            variant="brand"
            className="mt-6 w-full"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await sleep(1000);
              const u = useApp.getState().user;
              if (u)
                useDB.getState().book({
                  rentalId: r.id, companyId: r.companyId, vehicle: r.name, customer: { name: u.name, phone: u.phone }, city, from, to, days, driver, total: total + deposit,
                });
              setBusy(false);
              setDone(true);
            }}
          >
            Reserve & pay
          </Button>
        </div>
      )}
    </Sheet>
  );
}

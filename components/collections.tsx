"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, GitCompareArrows, Heart, Plus, X } from "lucide-react";
import { getSeller, type Car } from "@/lib/data/cars";
import { useLiveCars } from "@/lib/db";
import { useApp, useReady } from "@/lib/store";
import { cn, img, km, naira } from "@/lib/utils";
import { CarCard, CarCardSkeleton } from "./cards";
import { Button, Container, Img, Select, easeApple } from "./ui";

export function Saved() {
  const hydrated = useReady();
  const saved = useApp((s) => s.saved);
  const recent = useApp((s) => s.recent);
  const live = useLiveCars();
  const getCar = (id: string): Car | undefined => live.find((c) => c.id === id);
  const cars = saved.map(getCar).filter(Boolean) as Car[];
  const recentCars = recent.map(getCar).filter((c): c is Car => !!c && !saved.includes(c.id));
  return (
    <div className="pt-[64px]">
      <Container className="pt-10 sm:pt-14">
        <h1 className="headline text-[40px] sm:text-[56px]">Saved.</h1>
        <p className="mt-2 text-[17px] text-mute">Cars you love, in one place. We&apos;ll let you know if the price drops.</p>
        {!hydrated ? (
          <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <CarCardSkeleton key={i} />)}
          </div>
        ) : cars.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-[28px] bg-white py-20 text-center shadow-card">
            <Heart className="h-12 w-12 text-faint" strokeWidth={1.2} />
            <h3 className="mt-4 text-[21px] font-semibold tracking-tight">Nothing saved yet.</h3>
            <p className="mt-1 text-[15px] text-mute">Tap the heart on any car to keep it here.</p>
            <Button href="/cars" className="mt-6">Browse cars</Button>
          </div>
        ) : (
          <motion.div layout className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            <AnimatePresence>
              {cars.map((c) => (
                <motion.div key={c.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.4, ease: easeApple }}>
                  <CarCard car={c} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
        {hydrated && recentCars.length > 0 && (
          <section className="mt-20">
            <h2 className="text-[24px] font-semibold tracking-tight">Recently viewed</h2>
            <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {recentCars.slice(0, 4).map((c) => <CarCard key={c.id} car={c} compact />)}
            </div>
          </section>
        )}
      </Container>
    </div>
  );
}

export function Compare() {
  const hydrated = useReady();
  const ids = useApp((s) => s.compare);
  const toggle = useApp((s) => s.toggleCompare);
  const live = useLiveCars();
  const cars = ids.map((id) => live.find((c) => c.id === id)).filter(Boolean) as Car[];
  const slots = 3 - cars.length;

  const best = (fn: (c: Car) => number, dir: "min" | "max") => {
    if (cars.length < 2) return null;
    const vals = cars.map(fn);
    const t = dir === "min" ? Math.min(...vals) : Math.max(...vals);
    return cars.find((c) => fn(c) === t)?.id ?? null;
  };
  const rows: { label: string; get: (c: Car) => React.ReactNode; best?: string | null }[] = [
    { label: "Price", get: (c) => naira(c.price), best: best((c) => c.price, "min") },
    { label: "Year", get: (c) => c.year, best: best((c) => c.year, "max") },
    { label: "Mileage", get: (c) => km(c.mileage), best: best((c) => c.mileage, "min") },
    { label: "Condition", get: (c) => c.condition },
    { label: "Engine", get: (c) => c.engine },
    { label: "Transmission", get: (c) => c.transmission },
    { label: "Fuel", get: (c) => c.fuel },
    { label: "Body", get: (c) => c.body },
    { label: "Location", get: (c) => `${c.city}, ${c.state}` },
    { label: "Seller", get: (c) => getSeller(c.sellerId).name },
    { label: "Inspected", get: (c) => (c.inspected ? <Check className="mx-auto h-5 w-5 text-brand" /> : "—") },
    { label: "Duty paid", get: (c) => (c.dutyPaid ? <Check className="mx-auto h-5 w-5 text-brand" /> : "—") },
    { label: "Features", get: (c) => `${c.features.length} listed`, best: best((c) => c.features.length, "max") },
  ];

  return (
    <div className="pt-[64px]">
      <Container className="pt-10 sm:pt-14">
        <h1 className="headline text-[40px] sm:text-[56px]">Compare.</h1>
        <p className="mt-2 text-[17px] text-mute">Up to three cars, side by side. Best values highlighted.</p>

        {!hydrated ? null : (
          <div className="no-scrollbar -mx-5 mt-10 overflow-x-auto px-5">
            <div className="grid min-w-[720px] grid-cols-[140px_repeat(3,1fr)] gap-x-4">
              <div />
              {cars.map((c) => (
                <motion.div key={c.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
                  <button onClick={() => toggle(c.id)} className="glass absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full" aria-label="Remove">
                    <X className="h-4 w-4" />
                  </button>
                  <Link href={`/cars/${c.id}`}>
                    <Img src={img(c.img, 600, { h: 420 })} alt={c.model} className="aspect-[10/7] rounded-[20px]" />
                    <div className="mt-3 text-[17px] font-semibold tracking-tight">{c.year} {c.make} {c.model}</div>
                    <div className="text-[13px] text-mute">{c.trim}</div>
                  </Link>
                </motion.div>
              ))}
              {Array.from({ length: slots }).map((_, k) => (
                <div key={k} className="flex aspect-[10/7] flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-line p-4 text-center">
                  <Plus className="h-6 w-6 text-faint" />
                  <div className="mt-2 w-full max-w-[220px]">
                    <Select
                      value=""
                      onChange={(e) => e.target.value && toggle(e.target.value)}
                      className="h-10 text-[13px]"
                    >
                      <option value="">Add a car…</option>
                      {live.filter((c) => !ids.includes(c.id)).map((c) => (
                        <option key={c.id} value={c.id}>{c.year} {c.make} {c.model}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              ))}

              {cars.length > 0 &&
                rows.map((r) => (
                  <div key={r.label} className="contents">
                    <div className="border-b border-hair py-4 text-[13px] font-medium text-faint">{r.label}</div>
                    {[0, 1, 2].map((k) => {
                      const c = cars[k];
                      return (
                        <div key={k} className={cn("border-b border-hair py-4 text-center text-[15px]", c && r.best === c.id && "font-semibold text-brand-ink")}>
                          {c ? (
                            <span className={cn("inline-flex items-center gap-1.5", c && r.best === c.id && "rounded-full bg-brand-soft px-2.5 py-0.5")}>{r.get(c)}</span>
                          ) : (
                            ""
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          </div>
        )}
        {hydrated && cars.length === 0 && (
          <div className="mt-8 flex items-center gap-3 rounded-2xl bg-mist p-4 text-[14px] text-mute">
            <GitCompareArrows className="h-5 w-5 shrink-0" /> Tip: tap “Compare” on any car page to add it here.
          </div>
        )}
      </Container>
    </div>
  );
}

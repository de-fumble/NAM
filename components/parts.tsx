"use client";

import { motion } from "framer-motion";
import { BadgeCheck, CarFront, ClipboardList, Minus, Plus, RotateCcw, Search, ShieldCheck, Store, Truck, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PART_CATEGORIES, deliveryFor, type Part, type PartCategory } from "@/lib/data/parts";
import { useAllParts, useSuspended } from "@/lib/db";
import { blockGuest, useApp, toast } from "@/lib/store";
import { act, paused } from "@/lib/gate";
import { RequestSheet } from "./dashboard/customer";
import { cn, naira } from "@/lib/utils";
import { PartCard, PartVisual } from "./cards";
import { Badge, Button, Container, Select, Sheet, Skeleton, Stars, easeApple } from "./ui";

const FIT_MAKES = ["Toyota", "Lexus", "Honda", "Mercedes-Benz", "BMW", "Audi", "Hyundai", "Kia", "Nissan", "Ford", "Chevrolet", "Dodge"];

export function PartsStore() {
  const sp = useSearchParams();
  const router = useRouter();
  const [cat, setCat] = useState<PartCategory | "All">("All");
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [fit, setFit] = useState("");
  const [sort, setSort] = useState("best");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Part | null>(null);
  const [requesting, setRequesting] = useState(false);
  const all = useAllParts();
  const suspended = useSuspended();
  const parts = useMemo(() => all.filter((p) => p.active && !suspended.has(p.sellerId)), [all, suspended]);

  useEffect(() => {
    const id = sp.get("open");
    if (id) {
      const p = parts.find((x) => x.id === id);
      if (p) setOpen(p);
    }
  }, [sp, parts]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 380);
    return () => clearTimeout(t);
  }, [cat, fit, sort, q]);

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const out = parts.filter(
      (p) =>
        (cat === "All" || p.category === cat) &&
        (!fit || p.fits.includes(fit) || p.fits.includes("Universal")) &&
        words.every((w) => `${p.name} ${p.brand} ${p.category} ${p.fitsText}`.toLowerCase().includes(w)),
    );
    const by: Record<string, (a: Part, b: Part) => number> = {
      best: (a, b) => b.reviews - a.reviews,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
    };
    return [...out].sort(by[sort]);
  }, [cat, fit, sort, q, parts]);

  const close = () => {
    setOpen(null);
    if (sp.get("open")) router.replace("/parts", { scroll: false });
  };

  return (
    <div className="pt-[64px]">
      {/* Header band */}
      <section className="border-b border-hair bg-white">
        <Container className="py-10 sm:py-14">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: easeApple }} className="grid items-end gap-8 lg:grid-cols-[1fr_440px]">
            <div>
              <h1 className="headline text-[40px] sm:text-[56px]">Spare parts.</h1>
              <p className="mt-2 max-w-lg text-[17px] text-mute sm:text-[19px]">Genuine parts from vetted sellers. Next-day delivery in Lagos & Abuja. Guaranteed fit or your money back.</p>
            </div>
            <div className="rounded-[22px] bg-mist p-4">
              <div className="flex items-center gap-2 text-[13px] font-semibold">
                <CarFront className="h-4 w-4 text-brand" /> Shop for my car
              </div>
              <div className="mt-3 flex gap-2">
                <div className="flex-1">
                  <Select value={fit} onChange={(e) => setFit(e.target.value)} className="h-11 bg-white">
                    <option value="">Any vehicle</option>
                    {FIT_MAKES.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </Select>
                </div>
                {fit && (
                  <button onClick={() => setFit("")} className="grid h-11 w-11 place-items-center rounded-xl bg-white text-mute ring-1 ring-line" aria-label="Clear vehicle">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {fit && <p className="mt-2 text-[12px] text-brand-ink">Showing parts that fit {fit} vehicles, plus universal parts.</p>}
              <button onClick={() => act("partRequests", () => setRequesting(true))} className="mt-3 flex w-full items-center justify-between rounded-xl bg-white px-3.5 py-2.5 text-left text-[13px] ring-1 ring-line transition hover:ring-ink/40">
                <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-brand" /> Can&apos;t find it? <span className="font-semibold">Request a part</span></span>
                <span className="text-faint">→</span>
              </button>
            </div>
          </motion.div>
        </Container>
      </section>

      <Container className="pt-6">
        <div className="sticky top-[64px] z-20 -mx-5 bg-paper/85 px-5 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8">
          <div className="flex gap-2">
            <div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-white px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-link/50">
              <Search className="h-4 w-4 text-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parts, brands, part numbers…" className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint" />
            </div>
            <div className="w-40 sm:w-48">
              <Select value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 rounded-full text-[14px]">
                <option value="best">Best sellers</option>
                <option value="rating">Top rated</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </Select>
            </div>
          </div>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {(["All", ...PART_CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "relative h-9 shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors",
                  cat === c ? "text-white" : "bg-white text-ink ring-1 ring-line hover:ring-ink/40",
                )}
              >
                {cat === c && <motion.span layoutId="partcat" className="absolute inset-0 -z-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                <span className="relative">{c}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 mt-4 text-[14px] text-mute">{loading ? "Loading…" : `${list.length} parts`}</div>

        {loading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-square rounded-[22px]" />
                <Skeleton className="mt-3 h-3 w-16" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-20" />
                <Skeleton className="mt-3 h-9 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-[28px] bg-white py-20 text-center shadow-card">
            <h3 className="text-[21px] font-semibold">No parts found.</h3>
            <p className="mt-1 text-mute">Try a different category or post a request — sellers will quote you within the hour.</p>
            <Button className="mt-6" onClick={() => act("partRequests", () => setRequesting(true))}>Request this part</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-5">
            {list.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: easeApple, delay: Math.min(i, 10) * 0.035 }}>
                <PartCard part={p} onOpen={() => setOpen(p)} />
              </motion.div>
            ))}
          </div>
        )}
      </Container>

      <QuickView part={open} onClose={close} />
      <RequestSheet open={requesting} onClose={() => setRequesting(false)} initial={q} key={String(requesting)} />
    </div>
  );
}

function QuickView({ part: current, onClose }: { part: Part | null; onClose: () => void }) {
  const [qty, setQty] = useState(1);
  const [last, setLast] = useState<Part | null>(current);
  const add = useApp((s) => s.addToCart);
  const router = useRouter();
  useEffect(() => {
    if (current) {
      setLast(current);
      setQty(1);
    }
  }, [current]);
  const part = current ?? last;
  if (!part) return null;
  const d = deliveryFor(part);
  return (
    <Sheet open={!!current} onClose={onClose} wide>
      <div className="grid gap-8 pb-2 sm:grid-cols-2">
        <PartVisual category={part.category} big className="group aspect-square rounded-[24px]" />
        <div className="flex flex-col">
          <div className="text-[13px] font-medium text-faint">{part.brand} · {part.category}</div>
          <h2 className="mt-1 text-[24px] font-semibold leading-tight tracking-tight">{part.name}</h2>
          <div className="mt-2 flex items-center gap-1.5 text-[13px] text-mute">
            <Stars value={part.rating} /> {part.rating} · {part.reviews.toLocaleString()} ratings
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold tabular-nums">{naira(part.price)}</span>
            {part.oldPrice && <span className="text-[15px] text-faint line-through">{naira(part.oldPrice)}</span>}
          </div>
          <div className="mt-4 rounded-2xl bg-mist p-4 text-[14px]">
            <div className="font-medium">Fits</div>
            <div className="text-mute">{part.fitsText}</div>
          </div>
          <ul className="mt-4 space-y-2 text-[14px]">
            <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-brand" /> <b className="font-semibold">{d.label}</b> <span className="text-mute">{d.note}</span></li>
            <li className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-brand" /> 7-day returns if it doesn&apos;t fit</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand" /> {part.genuine ? "Genuine / OEM guaranteed" : "Quality aftermarket"}</li>
            <li className="flex items-center gap-2"><Store className="h-4 w-4 text-brand" /> <Link href={`/store/${part.sellerId}`} className="hover:underline">{part.seller}</Link> · {part.location} <BadgeCheck className="h-3.5 w-3.5 text-link" /></li>
          </ul>
          <div className="mt-auto pt-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center rounded-full bg-mist p-1">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white" aria-label="Decrease"><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center text-[15px] font-semibold tabular-nums">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(part.stock, q + 1))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white" aria-label="Increase"><Plus className="h-4 w-4" /></button>
              </div>
              {part.stock < 10 ? <Badge tone="gold">Only {part.stock} left</Badge> : <span className="text-[13px] text-brand">In stock</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  if (paused("parts") || blockGuest()) return onClose();
                  add(part.id, qty);
                  toast({ title: "Added to bag", body: `${qty} × ${part.name}`, tone: "success" });
                  onClose();
                }}
              >
                Add to bag
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  if (paused("parts") || blockGuest()) return onClose();
                  add(part.id, qty);
                  router.push("/cart");
                }}
              >
                Buy now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

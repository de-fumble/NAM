"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CarFront, Cog, CornerDownLeft, Search, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Car } from "@/lib/data/cars";
import { useAllParts, useLiveCars, useStock, useSuspended } from "@/lib/db";
import type { Part } from "@/lib/data/parts";
import { PROS } from "@/lib/data/pros";
import { useUI } from "@/lib/store";
import { cn, img, nairaShort } from "@/lib/utils";
import { easeApple } from "./ui";

type Item = { kind: "Car" | "Part" | "Pro" | "Page"; title: string; sub: string; href: string; thumb?: string };

const PAGES: Item[] = [
  { kind: "Page", title: "Sell your car", sub: "List in under 3 minutes", href: "/sell" },
  { kind: "Page", title: "Car loan calculator", sub: "Finance", href: "/finance" },
  { kind: "Page", title: "Import duty estimator", sub: "Finance", href: "/finance?tab=duty" },
  { kind: "Page", title: "VIN check", sub: "Decode any VIN before you buy", href: "/verify" },
  { kind: "Page", title: "Rent a car", sub: "With or without a driver", href: "/rentals" },
  { kind: "Page", title: "Compare cars", sub: "Side by side", href: "/compare" },
];

const carItem = (c: Car): Item => ({ kind: "Car", title: `${c.year} ${c.make} ${c.model} ${c.trim}`, sub: `${nairaShort(c.price)} · ${c.condition} · ${c.state}`, href: `/cars/${c.id}`, thumb: c.img });

const partItem = (p: Part): Item => ({ kind: "Part", title: p.name, sub: `${p.brand} · ${p.category} · ${nairaShort(p.price)}`, href: `/parts?q=${encodeURIComponent(p.name)}` });
const PRO_ITEMS: Item[] = PROS.map<Item>((p) => ({ kind: "Pro", title: p.name, sub: `${p.title} · ${p.city}`, href: `/services/${p.id}` }));

const SUGGEST = ["Camry", "Range Rover", "Tesla", "Brake pads", "Inspection", "Mechanic Lagos"];

export function CommandPalette() {
  const open = useUI((s) => s.paletteOpen);
  const setOpen = useUI((s) => s.setPalette);
  const live = useLiveCars();
  const parts = useAllParts();
  const suspended = useSuspended();
  const stock = useStock();
  const ALL = useMemo(
    () => [...live.map(carItem), ...parts.filter((p) => p.active && !suspended.has(p.sellerId)).map(partItem), ...(stock ? PRO_ITEMS : []), ...PAGES],
    [live, parts, suspended, stock],
  );
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useUI.getState().paletteOpen);
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [...live.filter((c) => c.featured).slice(0, 4).map(carItem), ...PAGES.slice(0, 4)];
    const words = t.split(/\s+/);
    return ALL.filter((a) => {
      const hay = `${a.title} ${a.sub} ${a.kind}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    }).slice(0, 9);
  }, [q, ALL, live]);

  useEffect(() => setIdx(0), [q]);

  const go = (it?: Item) => {
    if (!it) {
      if (q.trim()) router.push(`/cars?q=${encodeURIComponent(q.trim())}`);
    } else router.push(it.href);
    setOpen(false);
  };

  const icon = (k: Item["kind"]) => (k === "Car" ? CarFront : k === "Part" ? Cog : k === "Pro" ? Wrench : ArrowUpRight);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.28, ease: easeApple }}
            className="relative w-full max-w-[640px] overflow-hidden rounded-[22px] bg-white/95 shadow-float ring-1 ring-black/5 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 border-b border-hair px-5">
              <Search className="h-5 w-5 text-faint" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIdx((i) => Math.min(i + 1, results.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setIdx((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") go(results[idx]);
                  else if (e.key === "Escape") setOpen(false);
                }}
                placeholder="Search cars, parts, mechanics…"
                className="h-16 flex-1 bg-transparent text-[19px] outline-none placeholder:text-faint"
              />
              <kbd className="rounded-md bg-mist px-2 py-1 text-[11px] text-mute">esc</kbd>
            </div>
            {!q && (
              <div className="flex flex-wrap gap-2 px-5 pt-4">
                {SUGGEST.map((s) => (
                  <button key={s} onClick={() => setQ(s)} className="rounded-full bg-mist px-3 py-1.5 text-[13px] text-ink-2 hover:bg-hair">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="max-h-[52vh] overflow-y-auto p-2">
              {!q && <div className="px-3 pb-1 pt-3 text-[12px] font-medium text-faint">Featured & quick links</div>}
              {results.length === 0 && (
                <div className="px-3 py-10 text-center text-[15px] text-mute">
                  No matches for “{q}”. Press <span className="font-medium text-ink">Enter</span> to search all cars.
                </div>
              )}
              {results.map((r, i) => {
                const Icon = icon(r.kind);
                return (
                  <button
                    key={r.href + r.title}
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => go(r)}
                    className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", i === idx && "bg-mist")}
                  >
                    {r.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img(r.thumb, 120, { h: 90, q: 60 })} alt="" className="h-10 w-12 rounded-lg object-cover" />
                    ) : (
                      <span className="grid h-10 w-12 place-items-center rounded-lg bg-mist text-mute">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{r.title}</span>
                      <span className="block truncate text-[13px] text-mute">{r.sub}</span>
                    </span>
                    <span className="text-[11px] font-medium text-faint">{r.kind}</span>
                    {i === idx && <CornerDownLeft className="h-4 w-4 text-faint" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

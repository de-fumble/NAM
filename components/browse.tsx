"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BODIES, CONDITIONS, MAKES, STATES, getSeller, type Car } from "@/lib/data/cars";
import { useLiveCars } from "@/lib/db";
import { cn, nairaShort } from "@/lib/utils";
import { CarCard, CarCardSkeleton, CarRow } from "./cards";
import { Button, Chip, Container, Segmented, Select, Sheet, Toggle, easeApple } from "./ui";

const SORTS = {
  relevant: "Most relevant",
  newest: "Newest listings",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "mileage-asc": "Lowest mileage",
  "year-desc": "Year: newest first",
} as const;
type SortKey = keyof typeof SORTS;

const PRICE_PRESETS: [string, number | null, number | null][] = [
  ["Any", null, null],
  ["Under ₦10M", null, 10_000_000],
  ["₦10M – ₦30M", 10_000_000, 30_000_000],
  ["₦30M – ₦70M", 30_000_000, 70_000_000],
  ["₦70M – ₦150M", 70_000_000, 150_000_000],
  ["₦150M+", 150_000_000, null],
];

function useFilters() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const get = (k: string) => sp.get(k) ?? "";
  const f = {
    q: get("q"),
    makes: get("make") ? get("make").split(",") : [],
    body: get("body"),
    condition: get("condition"),
    fuel: get("fuel"),
    state: get("state"),
    min: Number(get("min")) || null,
    max: Number(get("max")) || null,
    ymin: Number(get("ymin")) || null,
    verified: get("verified") === "1",
    inspected: get("inspected") === "1",
    sort: (get("sort") || "relevant") as SortKey,
  };
  const set = (patch: Record<string, string | number | null | undefined>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === "" || v === 0) p.delete(k);
      else p.set(k, String(v));
    }
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  return { f, set, key: sp.toString() };
}

function applyFilters(cars: Car[], f: ReturnType<typeof useFilters>["f"]) {
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  let out = cars.filter((c) => {
    if (words.length) {
      const hay = `${c.year} ${c.make} ${c.model} ${c.trim} ${c.body} ${c.condition} ${c.state} ${c.city} ${c.fuel} ${getSeller(c.sellerId).name} ${c.condition === "Foreign Used" ? "tokunbo" : ""}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    if (f.makes.length && !f.makes.includes(c.make)) return false;
    if (f.body && c.body !== f.body) return false;
    if (f.condition && c.condition !== f.condition) return false;
    if (f.fuel && c.fuel !== f.fuel) return false;
    if (f.state && c.state !== f.state) return false;
    if (f.min && c.price < f.min) return false;
    if (f.max && c.price > f.max) return false;
    if (f.ymin && c.year < f.ymin) return false;
    if (f.verified && !c.verified) return false;
    if (f.inspected && !c.inspected) return false;
    return true;
  });
  const by: Record<SortKey, (a: Car, b: Car) => number> = {
    relevant: (a, b) => Number(!!b.featured) - Number(!!a.featured) || b.views - a.views,
    newest: (a, b) => a.postedDays - b.postedDays,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    "mileage-asc": (a, b) => a.mileage - b.mileage,
    "year-desc": (a, b) => b.year - a.year,
  };
  out = [...out].sort(by[f.sort]);
  return out;
}

export function Browse() {
  const { f, set, key } = useFilters();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sheet, setSheet] = useState(false);
  const [q, setQ] = useState(f.q);

  useEffect(() => setQ(f.q), [f.q]);

  // Simulated network latency so loading states are visible and consistent.
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 420);
    return () => clearTimeout(t);
  }, [key]);

  // Debounced search-as-you-type
  useEffect(() => {
    if (q === f.q) return;
    const t = setTimeout(() => set({ q }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const live = useLiveCars();
  const results = useMemo(() => applyFilters(live, f), [key, live]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCount =
    f.makes.length + [f.body, f.fuel, f.state, f.min || f.max ? "p" : "", f.ymin, f.verified ? 1 : "", f.inspected ? 1 : ""].filter(Boolean).length;

  const pills: { label: string; clear: () => void }[] = [
    ...f.makes.map((m) => ({ label: m, clear: () => set({ make: f.makes.filter((x) => x !== m).join(",") }) })),
    ...(f.body ? [{ label: f.body, clear: () => set({ body: null }) }] : []),
    ...(f.fuel ? [{ label: f.fuel, clear: () => set({ fuel: null }) }] : []),
    ...(f.state ? [{ label: f.state, clear: () => set({ state: null }) }] : []),
    ...(f.min || f.max ? [{ label: `${f.min ? nairaShort(f.min) : "₦0"} – ${f.max ? nairaShort(f.max) : "Any"}`, clear: () => set({ min: null, max: null }) }] : []),
    ...(f.ymin ? [{ label: `${f.ymin}+`, clear: () => set({ ymin: null }) }] : []),
    ...(f.verified ? [{ label: "Verified sellers", clear: () => set({ verified: null }) }] : []),
    ...(f.inspected ? [{ label: "Inspected", clear: () => set({ inspected: null }) }] : []),
  ];

  return (
    <div className="pt-[64px]">
      <Container className="pt-10 sm:pt-14">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: easeApple }}>
          <h1 className="headline text-[40px] sm:text-[56px]">Buy a car.</h1>
          <p className="mt-2 text-[17px] text-mute sm:text-[19px]">Brand new, tokunbo and Nigerian used — from verified sellers nationwide.</p>
        </motion.div>

        {/* Search + controls */}
        <div className="sticky top-[64px] z-20 -mx-5 mt-8 bg-paper/85 px-5 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-white px-4 ring-1 ring-line transition focus-within:ring-2 focus-within:ring-link/50">
              <Search className="h-4 w-4 text-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search make, model, city…"
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
              />
              {q && (
                <button onClick={() => setQ("")} className="grid h-5 w-5 place-items-center rounded-full bg-faint/30 text-white">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => setSheet(true)}
              className="relative inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-medium ring-1 ring-line transition hover:ring-ink/40 lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" /> <span className="hidden sm:inline">Filters</span>
              {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] text-white">{activeCount}</span>}
            </button>
            <div className="hidden w-52 sm:block">
              <Select value={f.sort} onChange={(e) => set({ sort: e.target.value === "relevant" ? null : e.target.value })} className="h-11 rounded-full text-[14px]">
                {Object.entries(SORTS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <div className="hidden rounded-full bg-[#e8e8ed]/70 p-1 sm:flex">
              {(["grid", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  aria-label={`${v} view`}
                  className={cn("grid h-9 w-9 place-items-center rounded-full transition", view === v ? "bg-white shadow-sm" : "text-mute")}
                >
                  {v === "grid" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            <Segmented
              size="sm"
              value={f.condition || "all"}
              onChange={(v) => set({ condition: v === "all" ? null : v })}
              options={[{ value: "all", label: "All" }, ...CONDITIONS.map((c) => ({ value: c, label: c === "Foreign Used" ? "Tokunbo" : c }))]}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-10">
          {/* Sidebar */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-[184px] max-h-[calc(100vh-190px)] overflow-y-auto pb-10 pr-2 no-scrollbar">
              <FilterPanel f={f} set={set} />
            </div>
          </aside>

          {/* Results */}
          <div className="min-w-0 flex-1">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="mr-2 text-[14px] text-mute">
                {loading ? "Searching…" : `${results.length} ${results.length === 1 ? "car" : "cars"}`}
              </span>
              <AnimatePresence initial={false}>
                {pills.map((p) => (
                  <motion.button
                    key={p.label}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={p.clear}
                    className="inline-flex h-7 items-center gap-1 rounded-full bg-mist pl-3 pr-2 text-[12px] font-medium hover:bg-hair"
                  >
                    {p.label} <X className="h-3 w-3" />
                  </motion.button>
                ))}
              </AnimatePresence>
              {pills.length > 1 && (
                <button
                  onClick={() => set({ make: null, body: null, fuel: null, state: null, min: null, max: null, ymin: null, verified: null, inspected: null })}
                  className="text-[12px] text-link"
                >
                  Clear all
                </button>
              )}
            </div>

            {loading ? (
              <div className={cn("grid gap-x-6 gap-y-10", view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <CarCardSkeleton key={i} />
                ))}
              </div>
            ) : results.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center rounded-[28px] bg-white py-20 text-center shadow-card">
                <Search className="h-10 w-10 text-faint" strokeWidth={1.4} />
                <h3 className="mt-4 text-[21px] font-semibold tracking-tight">No cars match those filters.</h3>
                <p className="mt-1 max-w-sm text-[15px] text-mute">Try widening your price range or removing a filter. New cars are listed every few minutes.</p>
                <Button className="mt-6" variant="secondary" onClick={() => set({ q: null, make: null, body: null, fuel: null, state: null, min: null, max: null, ymin: null, verified: null, inspected: null, condition: null })}>
                  Reset filters
                </Button>
              </motion.div>
            ) : view === "grid" ? (
              <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: easeApple, delay: Math.min(i, 8) * 0.04 }}>
                    <CarCard car={c} priority={i < 3} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: easeApple, delay: Math.min(i, 8) * 0.04 }}>
                    <CarRow car={c} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Filters">
        <div className="pb-4 sm:hidden">
          <div className="mb-1.5 text-[13px] font-medium text-ink-2">Sort by</div>
          <Select value={f.sort} onChange={(e) => set({ sort: e.target.value === "relevant" ? null : e.target.value })}>
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <FilterPanel f={f} set={set} />
        <div className="sticky bottom-0 -mx-6 mt-4 border-t border-hair bg-white px-6 pt-4">
          <Button className="w-full" size="lg" onClick={() => setSheet(false)}>
            Show {results.length} cars
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-hair py-5 first:pt-0">
      <h4 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-faint">{title}</h4>
      {children}
    </div>
  );
}

function FilterPanel({ f, set }: Omit<ReturnType<typeof useFilters>, "key">) {
  const live = useLiveCars();
  const counts = useMemo(() => live.reduce<Record<string, number>>((a, c) => ((a[c.make] = (a[c.make] ?? 0) + 1), a), {}), [live]);
  const [showAllMakes, setShowAllMakes] = useState(false);
  const makes = showAllMakes ? MAKES : MAKES.slice(0, 8);
  const priceKey = PRICE_PRESETS.find(([, a, b]) => a === f.min && b === f.max)?.[0] ?? "Any";
  return (
    <div>
      <FilterGroup title="Body type">
        <div className="flex flex-wrap gap-2">
          {BODIES.map((b) => (
            <Chip key={b} active={f.body === b} onClick={() => set({ body: f.body === b ? null : b })} className="h-8 px-3 text-[13px]">
              {b}
            </Chip>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Price">
        <div className="space-y-1">
          {PRICE_PRESETS.map(([l, a, b]) => (
            <button
              key={l}
              onClick={() => set({ min: a, max: b })}
              className={cn("flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[14px] transition", priceKey === l ? "bg-mist font-medium" : "hover:bg-mist/60")}
            >
              {l}
              {priceKey === l && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Make">
        <div className="space-y-0.5">
          {makes.map((m) => {
            const on = f.makes.includes(m);
            return (
              <label key={m} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-[14px] hover:bg-mist/60">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => set({ make: (on ? f.makes.filter((x) => x !== m) : [...f.makes, m]).join(",") })}
                  className="h-[18px] w-[18px] rounded-md accent-[#1d1d1f]"
                />
                <span className="flex-1">{m}</span>
                <span className="text-[12px] text-faint">{counts[m] ?? 0}</span>
              </label>
            );
          })}
        </div>
        <button onClick={() => setShowAllMakes((v) => !v)} className="mt-2 px-2 text-[13px] text-link">
          {showAllMakes ? "Show fewer" : `Show all ${MAKES.length}`}
        </button>
      </FilterGroup>
      <FilterGroup title="Location">
        <Select value={f.state} onChange={(e) => set({ state: e.target.value })}>
          <option value="">All of Nigeria</option>
          {STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </FilterGroup>
      <FilterGroup title="Year">
        <Select value={f.ymin ?? ""} onChange={(e) => set({ ymin: e.target.value })}>
          <option value="">Any year</option>
          {[2024, 2022, 2020, 2018, 2016, 2014, 2010].map((y) => (
            <option key={y} value={y}>
              {y} and newer
            </option>
          ))}
        </Select>
      </FilterGroup>
      <FilterGroup title="Fuel">
        <div className="flex flex-wrap gap-2">
          {["Petrol", "Diesel", "Hybrid", "Electric"].map((x) => (
            <Chip key={x} active={f.fuel === x} onClick={() => set({ fuel: f.fuel === x ? null : x })} className="h-8 px-3 text-[13px]">
              {x}
            </Chip>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Trust">
        <Toggle checked={f.verified} onChange={(v) => set({ verified: v ? 1 : null })} label="Verified sellers only" />
        <Toggle checked={f.inspected} onChange={(v) => set({ inspected: v ? 1 : null })} label="Inspected cars only" />
      </FilterGroup>
    </div>
  );
}

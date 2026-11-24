"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight, BadgeCheck, Banknote, ChevronLeft, ChevronRight, ClipboardCheck, KeyRound, ScanLine, Search, Ship, Store, Truck, Umbrella,
} from "lucide-react";
import { useRef, useState } from "react";
import { BODY_TILES } from "@/lib/data/cars";
import { useAllParts, useBusinesses, useLiveCars, useStock, useSuspended } from "@/lib/db";
import { IMG } from "@/lib/data/images";
import { PROS } from "@/lib/data/pros";
import { cn, img, monthlyPayment, nairaShort } from "@/lib/utils";
import { CarCard, PartCard, ProCard } from "./cards";
import { Avatar, Button, Container, Img, Reveal, SectionHead, Segmented, Stars, easeApple } from "./ui";

/* ---------------------------------- Hero ---------------------------------- */

type Mode = "buy" | "rent" | "parts" | "pros";
const placeholders: Record<Mode, string> = {
  buy: "Try “Camry 2020 under ₦35M in Lagos”",
  rent: "Where do you need a car?",
  parts: "Brake pads, battery, Mobil 1…",
  pros: "Mechanic, inspector, AC repair…",
};
const QUICK = [
  ["Tokunbo SUVs", "/cars?condition=Foreign+Used&body=SUV"],
  ["Under ₦15M", "/cars?max=15000000"],
  ["Electric", "/cars?fuel=Electric"],
  ["Abuja", "/cars?state=FCT+Abuja"],
  ["Brand new", "/cars?condition=Brand+New"],
];

export function Hero() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("buy");
  const [q, setQ] = useState("");
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const lift = useTransform(scrollYProgress, [0, 1], [0, -80]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = encodeURIComponent(q.trim());
    const base = { buy: "/cars", rent: "/rentals", parts: "/parts", pros: "/services" }[mode];
    router.push(t ? `${base}?q=${t}` : base);
  };

  return (
    <section ref={ref} className="relative overflow-hidden bg-black pb-16 pt-[120px] text-white sm:pb-24 sm:pt-[150px]">
      <motion.div style={{ scale }} className="absolute inset-0">
        <motion.div initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 2.2, ease: easeApple }} className="absolute inset-x-0 bottom-[-6%] top-[26%] sm:top-[30%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img(IMG.clsDark, 2400, { q: 85 })}
            alt=""
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-[60%_center] opacity-90"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-black from-25% via-black/50 via-45% to-transparent to-70%" />
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_100%,transparent,rgba(0,0,0,0.55))]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />
      </motion.div>

      <motion.div style={{ opacity: fade, y: lift }} className="relative">
        <Container className="flex flex-col items-center text-center">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: easeApple, delay: 0.3 }}
            className="headline max-w-4xl text-balance text-[44px] sm:text-[72px] lg:text-[88px]"
          >
            Every car.
            <br />
            <span className="bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">Every part. Every pro.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: easeApple, delay: 0.45 }}
            className="mt-5 max-w-xl text-balance text-[17px] leading-relaxed text-white/70 sm:text-[21px]"
          >
            Nigeria&apos;s premium auto marketplace. Buy, sell, fix, rent and finance — with inspected cars and verified sellers.
          </motion.p>

          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease: easeApple, delay: 0.6 }}
            className="mt-10 w-full max-w-2xl"
          >
            <Segmented
              dark
              size="sm"
              value={mode}
              onChange={setMode}
              options={[
                { value: "buy", label: "Buy" },
                { value: "rent", label: "Rent" },
                { value: "parts", label: "Parts" },
                { value: "pros", label: "Pros" },
              ]}
            />
            <div className="mt-4 flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 text-ink shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/20 transition-shadow focus-within:ring-4 focus-within:ring-white/25">
              <Search className="h-5 w-5 shrink-0 text-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={placeholders[mode]}
                className="h-11 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint sm:text-[17px]"
              />
              <Button type="submit" variant="brand" className="h-11 px-5 sm:px-6">
                Search
              </Button>
            </div>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="no-scrollbar mt-5 flex max-w-full gap-2 overflow-x-auto px-1"
          >
            {QUICK.map(([l, h]) => (
              <Link key={l} href={h} className="shrink-0 rounded-full border border-white/15 px-3.5 py-1.5 text-[13px] text-white/75 transition hover:border-white/40 hover:text-white">
                {l}
              </Link>
            ))}
          </motion.div>
        </Container>
      </motion.div>
    </section>
  );
}

/* ------------------------------- Trust strip ------------------------------- */

export function TrustStrip() {
  const items = [
    { icon: ScanLine, t: "Free VIN check", s: "Decode any car’s factory spec" },
    { icon: ClipboardCheck, t: "150-point inspections", s: "On every “Inspected” badge" },
    { icon: BadgeCheck, t: "Verified sellers", s: "ID, address and CAC checked" },
    { icon: Truck, t: "Next-day parts", s: "Lagos, Abuja & Port Harcourt" },
  ];
  return (
    <section className="border-b border-hair bg-white">
      <Container className="grid grid-cols-2 gap-x-6 gap-y-6 py-8 lg:grid-cols-4">
        {items.map((it, i) => (
          <Reveal key={it.t} delay={i * 0.06} y={12} className="flex items-start gap-3">
            <it.icon className="mt-0.5 h-6 w-6 shrink-0 text-brand" strokeWidth={1.6} />
            <div>
              <div className="text-[15px] font-semibold tracking-tight">{it.t}</div>
              <div className="text-[13px] text-mute">{it.s}</div>
            </div>
          </Reveal>
        ))}
      </Container>
    </section>
  );
}

/* ------------------------------ Body type rail ----------------------------- */

export function BodyRail() {
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (d: number) => rail.current?.scrollBy({ left: d * rail.current.clientWidth * 0.8, behavior: "smooth" });
  const stock = useStock();
  const cars = useLiveCars();
  // Stock data shows the marketing figures; live data counts real listings.
  const count = (t: (typeof BODY_TILES)[number]) => {
    if (stock) return `${countFor(t.label)} listings`;
    const n = cars.filter((c) => (t.body === "Electric" ? c.fuel === "Electric" : t.body === "Luxury" ? c.price >= 100_000_000 : c.body === t.body)).length;
    return n ? `${n.toLocaleString()} listing${n === 1 ? "" : "s"}` : "Be the first to list";
  };
  return (
    <section className="pt-20 sm:pt-28">
      <Container>
        <SectionHead
          eyebrow="Browse"
          title="Find your kind of car."
          action={
            <div className="hidden gap-2 sm:flex">
              <RailBtn onClick={() => scroll(-1)} dir="l" />
              <RailBtn onClick={() => scroll(1)} dir="r" />
            </div>
          }
        />
      </Container>
      <div ref={rail} className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-4 sm:scroll-px-8 sm:px-8 xl:px-[max(2rem,calc((100vw-1200px)/2+2rem))] xl:scroll-px-[max(2rem,calc((100vw-1200px)/2+2rem))]">
        {BODY_TILES.map((t, i) => (
          <Reveal key={t.label} delay={i * 0.05} className="snap-start">
            <Link href={t.href} className="group relative block h-[300px] w-[230px] overflow-hidden rounded-[26px] sm:h-[360px] sm:w-[270px]">
              <Img src={img(t.img, 700, { h: 900 })} alt={t.label} className="absolute inset-0" imgClassName="group-hover:scale-105 !duration-[1200ms]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/20" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 text-white">
                <div>
                  <div className="text-[24px] font-semibold tracking-tight">{t.label}</div>
                  <div className="text-[13px] text-white/70">{count(t)}</div>
                </div>
                <span className="grid h-9 w-9 translate-y-2 place-items-center rounded-full bg-white/20 opacity-0 backdrop-blur transition-all duration-500 ease-apple group-hover:translate-y-0 group-hover:opacity-100">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const countFor = (label: string) => ({ Sedans: "12,480", SUVs: "15,902", Pickups: "2,214", "Coupés": "1,880", Electric: "642", Luxury: "3,120", Hatchbacks: "4,305", Bikes: "7,968" })[label] ?? "1,000+";

function RailBtn({ onClick, dir }: { onClick: () => void; dir: "l" | "r" }) {
  const I = dir === "l" ? ChevronLeft : ChevronRight;
  return (
    <button onClick={onClick} className="grid h-9 w-9 place-items-center rounded-full bg-mist text-ink transition hover:bg-hair active:scale-95" aria-label={dir === "l" ? "Previous" : "Next"}>
      <I className="h-5 w-5" />
    </button>
  );
}

/* -------------------------------- Featured -------------------------------- */

export function Featured() {
  const [tab, setTab] = useState<"featured" | "new" | "tokunbo" | "naija">("featured");
  const live = useLiveCars();
  const list = live.filter((c) =>
    tab === "featured" ? c.featured : tab === "new" ? c.condition === "Brand New" || c.year >= 2021 : tab === "tokunbo" ? c.condition === "Foreign Used" && c.price < 60_000_000 : c.condition === "Nigerian Used",
  ).slice(0, 8);
  return (
    <section className="pt-20 sm:pt-28">
      <Container>
        <SectionHead
          eyebrow="Fresh this week"
          title="Hand-picked, inspected, ready."
          sub="Every featured car has passed a 150-point inspection and comes with verified papers."
          action={
            <Link href="/cars" className="group inline-flex items-center gap-1 text-[17px] text-link">
              See all cars <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        />
        {live.length > 0 && <Segmented
          className="mb-8 max-w-full overflow-x-auto no-scrollbar"
          value={tab}
          onChange={setTab}
          size="sm"
          options={[
            { value: "featured", label: "Featured" },
            { value: "new", label: "Newest" },
            { value: "tokunbo", label: "Tokunbo" },
            { value: "naija", label: "Nigerian used" },
          ]}
        />}
        {live.length === 0 && (
          <div className="flex flex-col items-center rounded-[28px] bg-white px-6 py-16 text-center shadow-card ring-1 ring-black/[0.03]">
            <h3 className="text-[24px] font-semibold tracking-tight">The first listings are on their way.</h3>
            <p className="mt-2 max-w-md text-[15px] text-mute">Dealers and private sellers are setting up now. List your car today and it&apos;s seen first.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button href="/sell">Sell your car</Button>
              <Button href="/business" variant="outline">Sell as a business</Button>
            </div>
          </div>
        )}
        <motion.div layout className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((c, i) => (
            <motion.div key={tab + c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: easeApple, delay: i * 0.05 }}>
              <CarCard car={c} />
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}

/* ---------------------------------- Bento --------------------------------- */

export function Bento() {
  return (
    <section className="pt-24 sm:pt-32">
      <Container>
        <SectionHead eyebrow="One app" title="Everything about cars. Finally in one place." className="text-center sm:block [&>div]:mx-auto" />
        <div className="grid auto-rows-[minmax(0,1fr)] grid-cols-1 gap-4 sm:grid-cols-6">
          {/* Sell */}
          <Reveal className="sm:col-span-4">
            <Link href="/sell" className="group relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-[30px] bg-black p-8 text-white sm:p-10">
              <Img src={img(IMG.amgGtBlack, 1400, { h: 900 })} alt="" className="absolute inset-0 !bg-black" imgClassName="opacity-70 group-hover:scale-[1.03] !duration-[1400ms]" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
              <div className="relative max-w-sm">
                <div className="text-[13px] font-semibold text-[#30d158]">Sell</div>
                <h3 className="headline mt-2 text-[34px] sm:text-[44px]">Sold in days, not months.</h3>
                <p className="mt-3 text-[17px] text-white/70">Snap a few photos, get an instant price estimate, and reach 2.1 million monthly buyers.</p>
              </div>
              <div className="relative mt-auto pt-8">
                <span className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[15px] font-medium text-ink transition group-hover:gap-3">
                  List your car free <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </Reveal>

          {/* Verify */}
          <Reveal delay={0.08} className="sm:col-span-2">
            <Link href="/verify" className="group flex h-full min-h-[420px] flex-col rounded-[30px] bg-white p-8 shadow-card ring-1 ring-black/[0.03]">
              <div className="text-[13px] font-semibold text-link">Verify</div>
              <h3 className="headline mt-2 text-[28px]">Check any VIN in seconds.</h3>
              <p className="mt-2 text-[15px] text-mute">Year, make, model, engine and factory spec — free, before you meet the seller.</p>
              <div className="mt-auto rounded-2xl bg-mist p-4 font-mono text-[13px] tracking-wider text-ink-2">
                <div className="flex items-center gap-2 text-[11px] font-sans font-medium tracking-normal text-faint">
                  <ScanLine className="h-4 w-4" /> VIN
                </div>
                <div className="mt-1">JTEMU5JR<span className="text-brand">XP6</span>089739</div>
                <div className="mt-3 flex flex-wrap gap-1.5 font-sans tracking-normal">
                  {["2023 Toyota 4Runner", "SR5", "Check digit valid"].map((t) => (
                    <span key={t} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-brand-ink">✓ {t}</span>
                  ))}
                </div>
              </div>
            </Link>
          </Reveal>

          {/* Finance */}
          <Reveal delay={0.04} className="sm:col-span-2">
            <Link href="/finance" className="group flex h-full min-h-[340px] flex-col rounded-[30px] bg-gradient-to-br from-[#e7f5ee] to-[#d2efe1] p-8">
              <Banknote className="h-8 w-8 text-brand" strokeWidth={1.5} />
              <h3 className="headline mt-4 text-[28px]">Drive now. Pay monthly.</h3>
              <p className="mt-2 text-[15px] text-ink-2/80">Loans from partner lenders with as little as 30% down.</p>
              <div className="mt-auto">
                <div className="text-[13px] text-ink-2/70">2020 Camry from</div>
                <div className="headline text-[44px] text-brand-ink">{nairaShort(monthlyPayment(32_500_000 * 0.7, 28, 48))}<span className="text-[17px] font-medium">/mo</span></div>
              </div>
            </Link>
          </Reveal>

          {/* Pros */}
          <Reveal delay={0.08} className="sm:col-span-2">
            <Link href="/services" className="group relative flex h-full min-h-[340px] flex-col overflow-hidden rounded-[30px] p-8 text-white">
              <Img src={img(IMG.mechanicSmile, 900, { h: 900 })} alt="" className="absolute inset-0" imgClassName="group-hover:scale-105 !duration-[1400ms]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="relative mt-auto">
                <div className="text-[13px] font-semibold text-[#ffd60a]">Hire a pro</div>
                <h3 className="headline mt-1 text-[28px]">2,300 vetted mechanics. One tap away.</h3>
              </div>
            </Link>
          </Reveal>

          {/* Insurance / duty */}
          <Reveal delay={0.12} className="sm:col-span-2">
            <div className="grid h-full min-h-[340px] grid-rows-2 gap-4">
              <Link href="/finance?tab=insurance" className="group flex items-center gap-4 rounded-[30px] bg-white p-6 shadow-card ring-1 ring-black/[0.03]">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#eef4ff] text-link">
                  <Umbrella className="h-7 w-7" strokeWidth={1.5} />
                </span>
                <div>
                  <h3 className="text-[19px] font-semibold tracking-tight">Insurance in 2 minutes</h3>
                  <p className="text-[14px] text-mute">Third-party or comprehensive.</p>
                </div>
              </Link>
              <Link href="/finance?tab=duty" className="group flex items-center gap-4 rounded-[30px] bg-white p-6 shadow-card ring-1 ring-black/[0.03]">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#fff4e5] text-gold">
                  <Ship className="h-7 w-7" strokeWidth={1.5} />
                </span>
                <div>
                  <h3 className="text-[19px] font-semibold tracking-tight">Importing? Estimate duty.</h3>
                  <p className="text-[14px] text-mute">Know the landing cost upfront.</p>
                </div>
              </Link>
            </div>
          </Reveal>

          {/* Rentals */}
          <Reveal className="sm:col-span-6">
            <Link href="/rentals" className="group relative flex min-h-[320px] items-end overflow-hidden rounded-[30px] p-8 text-white sm:p-10">
              <Img src={img(IMG.wraith, 2000, { h: 900 })} alt="" className="absolute inset-0" imgClassName="group-hover:scale-[1.03] !duration-[1400ms]" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />
              <div className="relative max-w-md">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-white/80">
                  <KeyRound className="h-4 w-4" /> Rentals
                </div>
                <h3 className="headline mt-2 text-[34px] sm:text-[44px]">From airport runs to the big day.</h3>
                <p className="mt-2 text-[17px] text-white/75">Chauffeur-driven executive cars, wedding Rolls-Royces and everyday self-drive.</p>
              </div>
            </Link>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------- Pros ---------------------------------- */

export function ProsSection() {
  // Pros are sample profiles until pro accounts launch, so they only show on stock data.
  if (!useStock()) return null;
  return (
    <section className="pt-24 sm:pt-32">
      <Container>
        <SectionHead
          eyebrow="Services"
          title="Trusted hands for every job."
          sub="Mechanics, inspectors, electricians and clearing agents — rated by real customers."
          action={
            <Link href="/services" className="group inline-flex items-center gap-1 text-[17px] text-link">
              Browse all pros <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROS.filter((p) => p.topRated).slice(0, 4).map((p, i) => (
            <Reveal key={p.id} delay={i * 0.06}>
              <ProCard pro={p} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------- Parts --------------------------------- */

export function PartsSection() {
  const router = useRouter();
  const suspended = useSuspended();
  const all = useAllParts().filter((p) => p.active && p.stock > 0 && !suspended.has(p.sellerId));
  const deals = [...all.filter((p) => p.oldPrice), ...all.filter((p) => !p.oldPrice)].slice(0, 5);
  if (!deals.length) return null;
  return (
    <section className="pt-24 sm:pt-32">
      <Container>
        <SectionHead
          eyebrow="Spare parts"
          title="Genuine parts. At your door tomorrow."
          sub="From Ladipo, Nnewi and authorised distributors — every seller vetted, every part guaranteed to fit."
          action={
            <Link href="/parts" className="group inline-flex items-center gap-1 text-[17px] text-link">
              Shop parts <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-5">
          {deals.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.05} className={cn(i === 4 && "hidden lg:block")}>
              <PartCard part={p} onOpen={() => router.push(`/parts?open=${p.id}`)} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* --------------------------------- Dealers -------------------------------- */

export function Dealers() {
  const dealers = useBusinesses().filter((b) => b.type === "dealer" && b.status !== "suspended").slice(0, 6);
  const cars = useLiveCars();
  if (!dealers.length) return null;
  return (
    <section className="pt-24 sm:pt-32">
      <Container>
        <SectionHead eyebrow="Storefronts" title="Top-rated dealers near you." />
        <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
          {dealers.map((s, i) => (
            <Reveal key={s.id} delay={i * 0.05} className="w-[200px] shrink-0 sm:w-auto">
              <Link href={`/store/${s.id}`} className="flex h-full flex-col items-center rounded-[24px] bg-white p-6 text-center shadow-card ring-1 ring-black/[0.03] transition hover:-translate-y-0.5 hover:shadow-float">
                <Avatar name={s.name} hue={s.hue} size={56} />
                <div className="mt-3 flex items-center gap-1 text-[15px] font-semibold leading-tight tracking-tight">
                  {s.name}
                </div>
                <div className="mt-1 text-[12px] text-faint">{s.city}, {s.state}</div>
                <div className="mt-3 flex items-center gap-1 text-[12px] text-mute">
                  <Stars value={s.rating} size={11} /> {s.rating}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[12px] text-mute">
                  <Store className="h-3 w-3" /> {cars.filter((c) => c.sellerId === s.id).length} cars
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------- Testimonials ------------------------------ */

export function Voices() {
  // Sample testimonials: hidden on live data.
  const stock = useStock();
  const quotes = [
    { q: "I bought my RAV4 from Abuja while living in Lagos. The inspector sent a 40-page report, and the car arrived at my gate exactly as described.", n: "Adaeze O.", r: "Bought a 2019 RAV4", h: 330 },
    { q: "Listed my Camry on Sunday night. Three serious calls by Monday morning and sold by Thursday — at my price.", n: "Femi A.", r: "Sold a 2017 Camry", h: 200 },
    { q: "My mechanic came to my office with a diagnostic machine. No more ‘oga, the part don spoil’ stories. Photos of everything.", n: "Hauwa M.", r: "Booked a home service", h: 40 },
  ];
  if (!stock) return null;
  return (
    <section className="pt-24 sm:pt-32">
      <Container>
        <SectionHead eyebrow="Real people" title="Loved from Lekki to Kano." />
        <div className="grid gap-4 md:grid-cols-3">
          {quotes.map((x, i) => (
            <Reveal key={x.n} delay={i * 0.08} className="flex flex-col rounded-[28px] bg-white p-8 shadow-card ring-1 ring-black/[0.03]">
              <Stars value={5} size={14} />
              <p className="mt-4 flex-1 text-[17px] leading-relaxed tracking-tight text-ink-2">“{x.q}”</p>
              <div className="mt-6 flex items-center gap-3">
                <Avatar name={x.n} hue={x.h} size={40} />
                <div>
                  <div className="text-[14px] font-semibold">{x.n}</div>
                  <div className="text-[12px] text-faint">{x.r}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------- CTA ---------------------------------- */

export function FinalCTA() {
  const cars = useLiveCars();
  const top = cars.length ? cars.reduce((a, b) => (b.price > a.price ? b : a)) : null;
  const low = cars.length ? cars.reduce((a, b) => (b.price < a.price ? b : a)) : null;
  return (
    <section className="pt-24 sm:pt-32">
      <Container>
        <Reveal className="relative overflow-hidden rounded-[36px] bg-mist px-8 py-16 text-center sm:py-24">
          <h2 className="headline mx-auto max-w-2xl text-balance text-[36px] sm:text-[56px]">Your next car is already here.</h2>
          <p className="mx-auto mt-4 max-w-lg text-[17px] text-mute sm:text-[19px]">
            {top && low && top.id !== low.id
              ? <>From a {nairaShort(low.price)} {low.make} to a {nairaShort(top.price)} {top.make}. Start browsing — it&apos;s free.</>
              : <>Verified sellers, inspected cars and free VIN checks. Start browsing — it&apos;s free.</>}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button href="/cars" size="lg">Browse cars</Button>
            <Button href="/sell" size="lg" variant="outline">Sell your car</Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

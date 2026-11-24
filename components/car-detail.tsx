"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck, Calendar, Check, ChevronLeft, ChevronRight, CircleCheckBig, ClipboardCheck, Eye, Fuel, Gauge, GitCompareArrows, MapPin, MessageCircle,
  Phone, ScanLine, Send, Share, ShieldCheck, Cog, Palette, X, Clock, Store,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { carDescription, getSeller, type Car } from "@/lib/data/cars";
import { IMG } from "@/lib/data/images";
import { blockGuest, useApp, toast, withUser, useReady } from "@/lib/store";
import { useAllCars, useDB, getBusiness, useEngine } from "@/lib/db";
import { inspectionPrice } from "@/lib/engines";
import { act, paused } from "@/lib/gate";
import { cn, img, km, monthlyPayment, naira, nairaShort, sleep } from "@/lib/utils";
import { CarCard, CarCardSkeleton, SaveButton } from "./cards";
import { Avatar, Badge, Button, Container, Img, Range, Reveal, Sheet, Stars, Ticker, WhatsAppIcon, easeApple } from "./ui";

/** False during the hydration render, so client-only store data never changes the server HTML. */
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/** Resolves a listing on the client: user listings, plus stock cars while the platform is on stock data. */
export function ListingFallback({ id, initial }: { id: string; initial?: Car }) {
  const hydrated = useReady();
  const mounted = useMounted();
  const car = useAllCars().find((c) => c.id === id);
  if (!mounted && initial) return <CarDetail car={initial} />;
  if (car) return <CarDetail car={car} />;
  if (!hydrated && initial) return <CarDetail car={initial} />;
  if (!hydrated)
    return (
      <Container className="pt-[100px]">
        <div className="grid gap-6 sm:grid-cols-3">{[0, 1, 2].map((i) => <CarCardSkeleton key={i} />)}</div>
      </Container>
    );
  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center pt-[64px] text-center">
      <h1 className="headline text-[40px]">This car has moved on.</h1>
      <p className="mt-2 text-[17px] text-mute">The listing was removed or sold.</p>
      <Button href="/cars" className="mt-6">Browse cars</Button>
    </Container>
  );
}

export function CarDetail({ car: base }: { car: Car }) {
  const mounted = useMounted();
  const store = useAllCars();
  // Until mounted, render exactly what the server rendered (the catalogue copy).
  const all = useMemo(() => (mounted ? store : []), [mounted, store]);
  const live = all.find((c) => c.id === base.id);
  const car: Car = live ?? base;
  const status = live?.status ?? "active";
  const seller = getSeller(car.sellerId);
  const user = useApp((s) => s.user);
  const own = mounted && !!user && (user.businessId === car.sellerId || car.sellerId === `u:${user.phone}`);
  const storeId = mounted ? getBusiness(car.sellerId)?.id : undefined;
  const pushRecent = useApp((s) => s.pushRecent);
  const inCompare = useApp((s) => s.compare.includes(car.id));
  const toggleCompare = useApp((s) => s.toggleCompare);
  const [chat, setChat] = useState(false);
  const [offer, setOffer] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  useEffect(() => pushRecent(car.id), [car.id, pushRecent]);

  const similar = useMemo(
    () =>
      all.filter((c) => c.id !== car.id && c.status === "active")
        .map((c) => ({ c, s: (c.body === car.body ? 2 : 0) + (c.make === car.make ? 2 : 0) + (Math.abs(c.price - car.price) / car.price < 0.4 ? 2 : 0) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 4)
        .map((x) => x.c),
    [car, all],
  );

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${car.year} ${car.make} ${car.model}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", tone: "success" });
      }
    } catch {}
  };

  const specs = [
    { icon: Calendar, l: "Year", v: String(car.year) },
    { icon: Gauge, l: "Mileage", v: car.mileage === 0 ? "Brand new" : km(car.mileage) },
    { icon: Cog, l: "Transmission", v: car.transmission },
    { icon: Fuel, l: "Fuel", v: car.fuel },
    { icon: Palette, l: "Colour", v: car.color },
    { icon: ShieldCheck, l: "Engine", v: car.engine },
  ];

  return (
    <div className="pb-16 pt-[64px] sm:pb-0">
      <Container className="pt-6">
        <nav className="flex items-center gap-1.5 text-[13px] text-mute">
          <Link href="/cars" className="hover:text-ink">Cars</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href={`/cars?make=${encodeURIComponent(car.make)}`} className="hover:text-ink">{car.make}</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate text-ink">{car.model}</span>
        </nav>

        <div className="mt-5 grid gap-10 lg:grid-cols-[1fr_380px]">
          {/* Left column */}
          <div className="min-w-0">
            <Gallery car={car} />

            <Reveal className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {specs.map((s) => (
                <div key={s.l} className="rounded-[20px] bg-white p-4 shadow-card ring-1 ring-black/[0.03]">
                  <s.icon className="h-5 w-5 text-faint" strokeWidth={1.6} />
                  <div className="mt-3 text-[12px] text-faint">{s.l}</div>
                  <div className="truncate text-[15px] font-semibold tracking-tight">{s.v}</div>
                </div>
              ))}
            </Reveal>

            <Reveal className="mt-12">
              <h2 className="text-[24px] font-semibold tracking-tight">Overview</h2>
              <p className="mt-3 text-[17px] leading-relaxed text-ink-2">{carDescription(car)}</p>
              {car.vin && (
                <Link href={`/verify?vin=${car.vin}`} className="mt-5 flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-card ring-1 ring-black/[0.03] transition hover:ring-black/[0.08]">
                  <ScanLine className={cn("h-5 w-5 shrink-0", car.vinMatch ? "text-brand" : "text-faint")} strokeWidth={1.6} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-faint">{car.vinMatch ? "VIN matched to this make and year" : "VIN"}</div>
                    <div className="break-all font-mono text-[15px] font-semibold tracking-[0.08em]">{car.vin}</div>
                  </div>
                  <span className="hidden shrink-0 text-[13px] text-link sm:block">Check it yourself</span>
                </Link>
              )}
            </Reveal>

            <Reveal className="mt-12">
              <h2 className="text-[24px] font-semibold tracking-tight">Features</h2>
              <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {car.features.map((x) => (
                  <li key={x} className="flex items-center gap-3 text-[15px]">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-soft text-brand">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
            </Reveal>

            {car.inspected && <InspectionSummary car={car} />}

            <FinanceWidget price={car.price} />

            <Reveal className="mt-12 rounded-[24px] bg-[#fff8e6] p-6">
              <h3 className="flex items-center gap-2 text-[17px] font-semibold">
                <ShieldCheck className="h-5 w-5 text-gold" /> Stay safe
              </h3>
              <ul className="mt-3 space-y-1.5 text-[14px] text-ink-2">
                <li>• Never pay a deposit before seeing the car in person.</li>
                <li>• Meet in a public place or at the dealer&apos;s registered showroom.</li>
                <li>• Match the VIN on the car to its customs papers with our VIN check before you pay.</li>
              </ul>
            </Reveal>
          </div>

          {/* Right column — sticky purchase panel */}
          <aside className="lg:sticky lg:top-[88px] lg:self-start">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: easeApple, delay: 0.1 }}
              className="rounded-[28px] bg-white p-6 shadow-card ring-1 ring-black/[0.03]"
            >
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="dark">{car.condition}</Badge>
                {car.dutyPaid && <Badge tone="brand">Customs duty paid</Badge>}
                {car.inspected && <Badge tone="brand"><ClipboardCheck className="h-3 w-3" /> Inspected</Badge>}
                {car.vinMatch && <Badge tone="brand"><ScanLine className="h-3 w-3" /> VIN matched</Badge>}
              </div>
              <h1 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.03em]">
                {car.year} {car.make} {car.model}
              </h1>
              <p className="text-[17px] text-mute">{car.trim}</p>
              <div className="mt-5 text-[34px] font-semibold tracking-[-0.03em] tabular-nums">{naira(car.price)}</div>
              <div className="mt-1 flex items-center gap-3 text-[13px] text-mute">
                {car.negotiable ? <span>Negotiable</span> : <span>Fixed price</span>}
                <span className="h-1 w-1 rounded-full bg-line" />
                <a href="#finance" className="text-link hover:underline">
                  or {nairaShort(monthlyPayment(car.price * 0.7, 28, 48))}/mo
                </a>
              </div>
              {own ? (
                <div className="mt-6 rounded-2xl bg-mist p-4">
                  <div className="text-[14px] font-semibold">This is your listing</div>
                  <p className="mt-0.5 text-[13px] text-mute">
                    {status === "active" ? "It's live." : status === "paused" ? "It's paused and hidden from buyers." : "It's marked as sold."} Edit price and status, and reply to buyers, from your dashboard.
                  </p>
                  <Button href={user?.role === "customer" ? "/dashboard" : "/dashboard/inventory"} className="mt-3 w-full">Manage in dashboard</Button>
                </div>
              ) : status !== "active" ? (
                <div className="mt-6 rounded-2xl bg-mist p-4 text-[14px] text-mute">
                  <span className="font-semibold text-ink">{status === "sold" ? "Sold." : "Not available right now."}</span> Browse similar cars below.
                </div>
              ) : (
              <div className="mt-6 grid gap-2.5">
                <Button size="lg" onClick={() => act("messaging", () => setChat(true))}>
                  <MessageCircle className="h-[18px] w-[18px]" /> Chat with seller
                </Button>
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={`https://wa.me/${seller.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, is the ${car.year} ${car.make} ${car.model} on Naija Auto Market still available?`)}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => blockGuest(e)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#25d366] text-[15px] font-medium text-white transition hover:bg-[#1fba59] active:scale-[0.97]"
                  >
                    <WhatsAppIcon className="h-[18px] w-[18px]" /> WhatsApp
                  </a>
                  <Button size="lg" variant="secondary" className="h-12" onClick={() => withUser(() => setShowPhone(true))}>
                    <Phone className="h-4 w-4" />
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span key={String(showPhone)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-[14px]">
                        {showPhone ? seller.phone.slice(5) : "Call"}
                      </motion.span>
                    </AnimatePresence>
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <Button variant="outline" onClick={() => act("offers", () => setOffer(true))}>
                    Make offer
                  </Button>
                  <Button variant="outline" onClick={() => act("inspections", () => setInspect(true))}>
                    Book inspection
                  </Button>
                </div>
              </div>
              )}
              <div className="mt-5 flex items-center justify-between border-t border-hair pt-4">
                <SaveButton id={car.id} label className="!bg-mist" />
                <button
                  onClick={() => {
                    const r = toggleCompare(car.id);
                    if (r === "full") toast({ title: "Compare is full", body: "Remove a car to add another (max 3)." });
                  }}
                  className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium transition", inCompare ? "bg-ink text-white" : "bg-mist")}
                >
                  <GitCompareArrows className="h-4 w-4" /> {inCompare ? "Comparing" : "Compare"}
                </button>
                <button onClick={share} className="grid h-9 w-9 place-items-center rounded-full bg-mist" aria-label="Share">
                  <Share className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[12px] text-faint">
                <Eye className="h-3.5 w-3.5" /> {car.views.toLocaleString()} views · Listed {car.postedDays === 0 ? "today" : `${car.postedDays}d ago`}
              </div>
            </motion.div>

            {/* Seller */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: easeApple, delay: 0.2 }}
              className="mt-4 rounded-[28px] bg-white p-6 shadow-card ring-1 ring-black/[0.03]"
            >
              <div className="flex items-center gap-3">
                <Avatar name={seller.name} hue={seller.name.length * 23} size={48} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[16px] font-semibold tracking-tight">
                    {storeId ? (
                      <Link href={`/store/${storeId}`} className="truncate hover:underline">{seller.name}</Link>
                    ) : (
                      <span className="truncate">{seller.name}</span>
                    )}
                    {seller.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-link" />}
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-mute">
                    <Stars value={seller.rating} size={11} /> {seller.rating} · {seller.reviews} reviews
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  [seller.type === "Dealer" ? <Store key="s" className="mx-auto h-4 w-4" /> : <BadgeCheck key="b" className="mx-auto h-4 w-4" />, seller.type],
                  [<Clock key="c" className="mx-auto h-4 w-4" />, `~${seller.responseMins}m reply`],
                  [<Calendar key="d" className="mx-auto h-4 w-4" />, `Since ${seller.since}`],
                ].map(([i, t], k) => (
                  <div key={k} className="rounded-2xl bg-mist px-2 py-3 text-[12px] text-ink-2">
                    <div className="text-faint">{i}</div>
                    <div className="mt-1 font-medium">{t}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-1.5 text-[13px] text-mute">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {car.city}, {car.state}</span>
                {storeId && (
                  <Link href={`/store/${storeId}`} className="font-medium text-link hover:underline">
                    Visit store
                  </Link>
                )}
              </div>
            </motion.div>
          </aside>
        </div>

        <section className="mt-24">
          <h2 className="headline text-[32px]">You might also like</h2>
          <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((c) => (
              <CarCard key={c.id} car={c} compact />
            ))}
          </div>
        </section>
      </Container>

      {/* Mobile sticky CTA */}
      <div className="glass fixed inset-x-0 bottom-[58px] z-30 flex items-center gap-3 border-t border-black/5 px-5 py-3 sm:hidden">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] text-mute">{car.year} {car.make} {car.model}</div>
          <div className="text-[17px] font-semibold tabular-nums">{nairaShort(car.price)}</div>
        </div>
        {own ? (
          <Button href="/dashboard">Manage</Button>
        ) : status === "active" ? (
          <Button onClick={() => act("messaging", () => setChat(true))}>
            <MessageCircle className="h-4 w-4" /> Chat
          </Button>
        ) : (
          <span className="text-[14px] font-medium text-mute">{status === "sold" ? "Sold" : "Unavailable"}</span>
        )}
      </div>

      <ChatSheet open={chat} onClose={() => setChat(false)} car={car} />
      <OfferSheet open={offer} onClose={() => setOffer(false)} car={car} />
      <InspectSheet open={inspect} onClose={() => setInspect(false)} car={car} />
    </div>
  );
}

/* --------------------------------- Gallery --------------------------------- */

function Gallery({ car }: { car: Car }) {
  const shots = useMemo(
    () =>
      car.photos?.length
        ? car.photos.map((ph, k) => ({ src: ph, thumb: ph, label: k === 0 ? "Cover" : `Photo ${k + 1}` }))
        : [
      { src: img(car.img, 1600, { h: 1100 }), thumb: img(car.img, 240, { h: 170 }), label: "Exterior" },
      { src: img(car.img, 1600, { h: 1100, fx: 0.35, fy: 0.55, z: 1.7 }), thumb: img(car.img, 240, { h: 170, fx: 0.35, fy: 0.55, z: 1.7 }), label: "Front detail" },
      { src: img(car.img, 1600, { h: 1100, fx: 0.68, fy: 0.6, z: 1.9 }), thumb: img(car.img, 240, { h: 170, fx: 0.68, fy: 0.6, z: 1.9 }), label: "Wheel & profile" },
      { src: img(IMG.interior, 1600, { h: 1100 }), thumb: img(IMG.interior, 240, { h: 170 }), label: "Interior (representative)" },
    ],
    [car.img, car.photos],
  );
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [light, setLight] = useState(false);
  const go = (n: number) => {
    setDir(n > i ? 1 : -1);
    setI((n + shots.length) % shots.length);
  };

  useEffect(() => {
    if (!light) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
      if (e.key === "Escape") setLight(false);
    };
    window.addEventListener("keydown", on);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", on);
      document.body.style.overflow = "";
    };
  });

  return (
    <div>
      <div className="group relative aspect-[16/11] overflow-hidden rounded-[28px] bg-mist">
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={i}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.5, ease: easeApple }}
            className="absolute inset-0 cursor-zoom-in"
            onClick={() => setLight(true)}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(i + 1);
              else if (info.offset.x > 60) go(i - 1);
            }}
          >
            <Img src={shots[i].src} alt={shots[i].label} priority className="h-full w-full" />
          </motion.div>
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
          <Badge tone="glass">{shots[i].label}</Badge>
          <Badge tone="glass">{i + 1} / {shots.length}</Badge>
        </div>
        {(["l", "r"] as const).map((d) => (
          <button
            key={d}
            onClick={() => go(d === "l" ? i - 1 : i + 1)}
            className={cn(
              "glass absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full opacity-0 shadow-card transition duration-300 group-hover:opacity-100",
              d === "l" ? "left-4" : "right-4",
            )}
            aria-label={d === "l" ? "Previous photo" : "Next photo"}
          >
            {d === "l" ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3">
        {shots.map((s, k) => (
          <button
            key={k}
            onClick={() => go(k)}
            className={cn("relative overflow-hidden rounded-2xl transition duration-300", k === i ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : "opacity-70 hover:opacity-100")}
          >
            <Img src={s.thumb} alt={s.label} className="aspect-[4/3]" />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {light && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[95] flex flex-col bg-black">
            <div className="flex items-center justify-between p-4 text-white">
              <span className="text-[14px] text-white/60">{shots[i].label} · {i + 1} of {shots.length}</span>
              <button onClick={() => setLight(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative flex-1">
              <AnimatePresence initial={false} custom={dir}>
                <motion.img
                  key={i}
                  src={shots[i].src}
                  alt=""
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: easeApple }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60) go(i + 1);
                    else if (info.offset.x > 60) go(i - 1);
                  }}
                  className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
                />
              </AnimatePresence>
              <button onClick={() => go(i - 1)} className="absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white" aria-label="Previous">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button onClick={() => go(i + 1)} className="absolute right-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white" aria-label="Next">
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------- Inspection summary --------------------------- */

function InspectionSummary({ car }: { car: Car }) {
  const seed = car.id.length;
  const rows = [
    ["Engine & transmission", 92 + (seed % 7)],
    ["Body & paint", 86 + (seed % 11)],
    ["Interior", 90 + (seed % 9)],
    ["Electricals", 94 + (seed % 5)],
    ["Suspension & brakes", 88 + (seed % 8)],
  ] as const;
  const overall = Math.round(rows.reduce((a, [, v]) => a + v, 0) / rows.length);
  return (
    <Reveal className="mt-12 rounded-[28px] bg-white p-6 shadow-card ring-1 ring-black/[0.03] sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow">150-point inspection</div>
          <h2 className="mt-1 text-[24px] font-semibold tracking-tight">Passed with confidence.</h2>
          <p className="mt-1 text-[14px] text-mute">No flood history · No structural damage · Odometer verified</p>
        </div>
        <div className="relative grid h-20 w-20 shrink-0 place-items-center">
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e8e8ed" strokeWidth="3" />
            <motion.circle
              cx="18" cy="18" r="15.5" fill="none" stroke="#00875a" strokeWidth="3" strokeLinecap="round"
              strokeDasharray="97.4"
              initial={{ strokeDashoffset: 97.4 }}
              whileInView={{ strokeDashoffset: 97.4 * (1 - overall / 100) }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: easeApple }}
            />
          </svg>
          <span className="text-[22px] font-semibold tabular-nums">{overall}</span>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {rows.map(([l, v], k) => (
          <div key={l}>
            <div className="mb-1.5 flex justify-between text-[14px]">
              <span>{l}</span>
              <span className="tabular-nums text-mute">{v}/100</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-hair">
              <motion.div
                className="h-full rounded-full bg-ink"
                initial={{ width: 0 }}
                whileInView={{ width: `${v}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, ease: easeApple, delay: k * 0.08 }}
              />
            </div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

/* ----------------------------- Finance widget ----------------------------- */

export function FinanceWidget({ price }: { price: number }) {
  const [down, setDown] = useState(30);
  const [months, setMonths] = useState(36);
  const rate = 26 + (months > 36 ? 2 : 0);
  const principal = price * (1 - down / 100);
  const pm = monthlyPayment(principal, rate, months);
  return (
    <Reveal id="finance" className="mt-12 scroll-mt-24 rounded-[28px] bg-gradient-to-br from-[#f2faf6] to-[#e4f3eb] p-6 sm:p-8">
      <div className="eyebrow">Financing</div>
      <h2 className="mt-1 text-[24px] font-semibold tracking-tight">Estimate your monthly payment.</h2>
      <div className="mt-6 grid gap-8 sm:grid-cols-2">
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex justify-between text-[14px]">
              <span>Down payment</span>
              <span className="font-semibold tabular-nums">{down}% · {nairaShort(price * (down / 100))}</span>
            </div>
            <Range value={down} min={20} max={80} step={5} onChange={setDown} />
          </div>
          <div>
            <div className="mb-2 flex justify-between text-[14px]">
              <span>Term</span>
              <span className="font-semibold tabular-nums">{months} months</span>
            </div>
            <Range value={months} min={12} max={60} step={6} onChange={setMonths} />
          </div>
        </div>
        <div className="flex flex-col justify-center rounded-[22px] bg-white p-6 text-center shadow-card">
          <div className="text-[13px] text-mute">Estimated monthly</div>
          <div className="headline mt-1 text-[40px] text-brand-ink">
            <Ticker value={pm} format={(n) => naira(n)} />
          </div>
          <div className="mt-1 text-[12px] text-faint">{rate}% p.a. indicative · subject to approval</div>
          <Button href="/finance" variant="brand" size="sm" className="mx-auto mt-4">
            Get pre-approved
          </Button>
        </div>
      </div>
    </Reveal>
  );
}

/* ---------------------------------- Chat ---------------------------------- */

function ChatSheet({ open, onClose, car }: { open: boolean; onClose: () => void; car: Car }) {
  const seller = getSeller(car.sellerId);
  const user = useApp((s) => s.user);
  const threads = useDB((s) => s.threads);
  const markRead = useDB((s) => s.markRead);
  const addLead = useDB((s) => s.addLead);
  const sendMsg = useDB((s) => s.send);
  const thread = user ? threads.find((t) => t.businessId === car.sellerId && t.customer.phone === user.phone && t.topic.kind === "car" && t.topic.id === car.id) : undefined;
  const msgs = thread?.messages ?? [];
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    { const box = end.current?.parentElement; if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" }); }
  }, [msgs.length]);
  useEffect(() => {
    if (open && thread?.unreadCust) markRead(thread.id, "cust");
  }, [open, thread?.id, thread?.unreadCust, markRead]);

  const { params: chatRules } = useEngine("messaging");
  const send = (t: string) => {
    if (!t.trim() || !user || paused("messaging")) return;
    const customer = { name: user.name, phone: user.phone };
    if (!thread) addLead({ carId: car.id, businessId: car.sellerId, customer, kind: "message", note: t.trim() });
    sendMsg({ businessId: car.sellerId, customer, topic: { kind: "car", id: car.id, title: `${car.year} ${car.make} ${car.model}` }, from: "customer", text: t.trim() });
    setText("");
  };

  const quick = ["Is it still available?", "Where can I inspect it?", "What's your last price?", "Are the papers complete?"];
  const last = msgs[msgs.length - 1];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2.5">
          <Avatar name={seller.name} hue={seller.name.length * 23} size={32} />
          <span>
            <span className="block text-[15px] leading-tight">{seller.name}</span>
            <span className="block text-[12px] font-normal text-brand">● Usually replies in ~{seller.responseMins} min</span>
          </span>
        </span>
      }
    >
      <div className="flex items-center gap-3 rounded-2xl bg-mist p-2.5">
        <Img src={img(car.img, 160, { h: 120 })} alt="" className="h-12 w-16 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold">{car.year} {car.make} {car.model}</div>
          <div className="text-[13px] text-mute">{naira(car.price)}</div>
        </div>
      </div>
      <div className="h-[38vh] space-y-2 overflow-y-auto py-4">
        {msgs.length === 0 && <p className="pt-10 text-center text-[13px] text-faint">Messages are protected. Never share bank PINs or OTPs.</p>}
        {msgs.map((m, k) => (
          <motion.div
            key={k}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn("flex", m.from === "customer" ? "justify-end" : "justify-start")}
          >
            <div className={cn("max-w-[80%] rounded-[20px] px-4 py-2 text-[15px] leading-snug", m.from === "customer" ? "rounded-br-md bg-link text-white" : "rounded-bl-md bg-mist text-ink")}>
              {m.text}
            </div>
          </motion.div>
        ))}
        {last?.from === "customer" && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="pt-2 text-center text-[12px] text-faint">
            Delivered to {seller.name}. Replies appear here and in your <Link href="/dashboard/messages" className="text-link hover:underline">dashboard</Link>.
          </motion.p>
        )}
        <div ref={end} />
      </div>
      <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 pb-3">
        {quick.map((q) => (
          <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[13px] hover:border-ink">
            {q}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="flex items-center gap-2 rounded-full bg-mist p-1 pl-4"
      >
        <input value={text} maxLength={Number(chatRules.maxLength)} onChange={(e) => setText(e.target.value)} placeholder="Message" className="h-10 flex-1 bg-transparent text-[16px] outline-none" />
        <button type="submit" disabled={!text.trim()} className="grid h-9 w-9 place-items-center rounded-full bg-link text-white transition disabled:opacity-30" aria-label="Send">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </Sheet>
  );
}

/* ---------------------------------- Offer --------------------------------- */

function OfferSheet({ open, onClose, car }: { open: boolean; onClose: () => void; car: Car }) {
  // Lowest offer allowed: Admin → Engines → Offers.
  const minPct = Number(useEngine("offers").params.minPercent);
  const [pick, setPct] = useState(92);
  const pct = Math.max(minPct, pick);
  const [busy, setBusy] = useState(false);
  const amount = Math.round((car.price * pct) / 100 / 50_000) * 50_000;
  const likely = pct >= 94 ? "Strong offer — likely to be accepted" : pct >= 88 ? "Fair offer — seller may counter" : "Low offer — may be declined";
  return (
    <Sheet open={open} onClose={onClose} title="Make an offer">
      <p className="text-[15px] text-mute">Asking price {naira(car.price)}</p>
      <div className="my-8 text-center">
        <div className="headline text-[44px] tabular-nums">
          <Ticker value={amount} format={naira} />
        </div>
        <div className={cn("mt-1 text-[13px] font-medium", pct >= 94 ? "text-brand" : pct >= 88 ? "text-gold" : "text-[#d70015]")}>{likely}</div>
      </div>
      <Range value={pct} min={minPct} max={100} onChange={setPct} />
      <div className="mt-2 flex justify-between text-[12px] text-faint">
        <span>{nairaShort((car.price * minPct) / 100)}</span>
        <span>{nairaShort(car.price)}</span>
      </div>
      <Button
        className="mt-8 w-full"
        size="lg"
        loading={busy}
        onClick={async () => {
          if (paused("offers")) return;
          setBusy(true);
          await sleep(600);
          const u = useApp.getState().user;
          if (u) {
            const customer = { name: u.name, phone: u.phone };
            const db = useDB.getState();
            db.addLead({ carId: car.id, businessId: car.sellerId, customer, kind: "offer", amount, note: `Offered ${naira(amount)} (${pct}% of asking)` });
            db.send({ businessId: car.sellerId, customer, topic: { kind: "car", id: car.id, title: `${car.year} ${car.make} ${car.model}` }, from: "customer", text: `I've made an offer of ${naira(amount)} for this car.` });
          }
          setBusy(false);
          onClose();
          toast({ title: "Offer sent", body: `${naira(amount)} to ${getSeller(car.sellerId).name}. Track it in your dashboard.`, tone: "success" });
        }}
      >
        Send offer
      </Button>
      <p className="mt-3 text-center text-[12px] text-faint">Offers are non-binding until you and the seller agree.</p>
    </Sheet>
  );
}

/* -------------------------------- Inspection ------------------------------- */

function InspectSheet({ open, onClose, car }: { open: boolean; onClose: () => void; car: Car }) {
  const days = useMemo(() => {
    const out: Date[] = [];
    const d = new Date();
    for (let k = 1; out.length < 7; k++) {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + k);
      if (x.getDay() !== 0) out.push(x);
    }
    return out;
  }, []);
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState("10:00");
  const [plan, setPlan] = useState<"essential" | "complete">("complete");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (open) setDone(false);
  }, [open]);
  const { params: inspectRules } = useEngine("inspections");
  const price = inspectionPrice(plan, inspectRules);
  return (
    <Sheet open={open} onClose={onClose} title={done ? "" : "Book an inspection"}>
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}>
              <CircleCheckBig className="h-16 w-16 text-brand" strokeWidth={1.4} />
            </motion.div>
            <h3 className="mt-4 text-[24px] font-semibold tracking-tight">You&apos;re booked.</h3>
            <p className="mt-2 max-w-xs text-[15px] text-mute">
              A certified inspector will meet the car at {car.city} on{" "}
              {days[day].toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "short" })} at {slot}. Report in your inbox within 2 hours.
            </p>
            <Button className="mt-6" onClick={onClose}>Done</Button>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0 }}>
            <p className="text-[15px] text-mute">A certified inspector checks 150 points, paint depth, OBD codes and customs papers.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {(
                [
                  ["essential", "Essential", inspectionPrice("essential", inspectRules), "100-point check"],
                  ["complete", "Complete", inspectionPrice("complete", inspectRules), "150 points + papers"],
                ] as const
              ).map(([k, l, p, d]) => (
                <button
                  key={k}
                  onClick={() => setPlan(k)}
                  className={cn("rounded-2xl border-2 p-4 text-left transition", plan === k ? "border-ink" : "border-hair hover:border-line")}
                >
                  <div className="text-[15px] font-semibold">{l}</div>
                  <div className="text-[13px] text-mute">{d}</div>
                  <div className="mt-2 text-[15px] font-semibold tabular-nums">{naira(p)}</div>
                </button>
              ))}
            </div>
            <div className="mt-6 text-[13px] font-medium text-ink-2">Day</div>
            <div className="no-scrollbar -mx-6 mt-2 flex gap-2 overflow-x-auto px-6">
              {days.map((d, k) => (
                <button
                  key={k}
                  onClick={() => setDay(k)}
                  className={cn("flex w-14 shrink-0 flex-col items-center rounded-2xl py-2.5 transition", day === k ? "bg-ink text-white" : "bg-mist hover:bg-hair")}
                >
                  <span className="text-[11px] opacity-70">{d.toLocaleDateString("en-NG", { weekday: "short" })}</span>
                  <span className="text-[19px] font-semibold">{d.getDate()}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 text-[13px] font-medium text-ink-2">Time</div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {["09:00", "10:00", "11:30", "13:00", "14:30", "16:00"].map((t) => (
                <button key={t} onClick={() => setSlot(t)} className={cn("h-10 rounded-xl text-[14px] font-medium transition", slot === t ? "bg-ink text-white" : "bg-mist hover:bg-hair")}>
                  {t}
                </button>
              ))}
            </div>
            <Button
              className="mt-7 w-full"
              size="lg"
              variant="brand"
              loading={busy}
              onClick={async () => {
                if (paused("inspections")) return;
                setBusy(true);
                await sleep(900);
                const u = useApp.getState().user;
                if (u) {
                  const customer = { name: u.name, phone: u.phone };
                  const d = days[day];
                  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                  const db = useDB.getState();
                  const label = plan === "essential" ? "Essential" : "Complete";
                  db.addInspection({ carId: car.id, businessId: car.sellerId, customer, date, slot, plan: label, price });
                  db.addLead({ carId: car.id, businessId: car.sellerId, customer, kind: "inspection", note: `Booked ${label} inspection, ${d.toLocaleDateString("en-NG", { weekday: "short" })} ${slot}` });
                }
                setBusy(false);
                setDone(true);
              }}
            >
              Pay {naira(price)}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

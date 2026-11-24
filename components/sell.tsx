"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, Check, CircleCheckBig, ImagePlus, ScanLine, Sparkles, TriangleAlert, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BODIES, STATES, type Body, type Car, type Condition } from "@/lib/data/cars";
import { useApp, useReady, useUI, toast } from "@/lib/store";
import { act } from "@/lib/gate";
import { useBusiness, useDB, useEngine } from "@/lib/db";
import { compressImage } from "@/lib/files";
import { cn, naira, nairaShort, sleep } from "@/lib/utils";
import { cleanVin, isVin, lookupVin, normalizeMake, toBody, toFuel, toTransmission, vinMatches, vinTitle, type VinReport } from "@/lib/vin";
import { Button, Chip, Container, Field, Input, Segmented, Select, Toggle, easeApple } from "./ui";

const MAKES = ["Toyota", "Lexus", "Honda", "Mercedes-Benz", "BMW", "Hyundai", "Kia", "Ford", "Nissan", "Land Rover", "Audi", "Volkswagen", "Peugeot", "Innoson", "Tesla", "Porsche", "Other"];
const TIER: Record<string, number> = {
  Toyota: 38, Lexus: 62, Honda: 34, "Mercedes-Benz": 75, BMW: 70, Hyundai: 26, Kia: 25, Ford: 40, Nissan: 28, "Land Rover": 110,
  Audi: 58, Volkswagen: 24, Peugeot: 18, Innoson: 20, Tesla: 70, Porsche: 160, Other: 25,
};

const STEPS = ["Vehicle", "Details", "Photos", "Price", "Review"] as const;

interface Draft {
  make: string; model: string; year: number; condition: Condition; body: Body | "";
  mileage: string; transmission: "Automatic" | "Manual"; fuel: string; color: string; state: string; city: string; description: string;
  dutyPaid: boolean; accidentFree: boolean; photos: string[]; price: string; negotiable: boolean; plan: "free" | "boost" | "premium";
  vin: string; decoded: VinReport | null;
}

const initial: Draft = {
  make: "", model: "", year: 2018, condition: "Foreign Used", body: "", mileage: "", transmission: "Automatic", fuel: "Petrol", color: "", state: "Lagos", city: "",
  description: "", dutyPaid: true, accidentFree: true, photos: [], price: "", negotiable: true, plan: "boost",
  vin: "", decoded: null,
};

/** The decoded VIN only counts while the seller's make and year still agree with it. */
const vinOk = (d: Draft) => !!d.decoded && d.decoded.vin === cleanVin(d.vin) && vinMatches(d.decoded, d.make, d.year);

function estimate(d: Draft) {
  const base = (TIER[d.make] ?? 25) * 1_000_000;
  const age = Math.max(0, 2026 - d.year);
  const dep = Math.pow(0.88, age);
  const cond = d.condition === "Brand New" ? 1.35 : d.condition === "Foreign Used" ? 1 : 0.72;
  const km = Number(d.mileage) || 60_000;
  const mil = Math.max(0.75, 1 - (km - 60_000) / 600_000);
  const mid = base * dep * cond * mil * (d.body === "SUV" ? 1.15 : d.body === "Pickup" ? 1.1 : 1);
  const r = (n: number) => Math.round(n / 100_000) * 100_000;
  return { low: r(mid * 0.88), mid: r(mid), high: r(mid * 1.12) };
}

/** Guests can look around, but listing a car needs an account. */
export function SellWizard() {
  const ready = useReady();
  const signedIn = useApp((s) => !!s.user);
  // Admin → Engines → Car listings: while paused, nobody starts a listing they can't publish.
  const listings = useEngine("listings");
  if (ready && !listings.running) return <SellGate paused={listings.message} />;
  return ready && !signedIn ? <SellGate /> : <Wizard />;
}

function SellGate({ paused: pausedText }: { paused?: string }) {
  const setAuth = useUI((s) => s.setAuth);
  return (
    <div className="pt-[64px]">
      <Container className="max-w-[560px] pt-16 text-center sm:pt-24">
        <div className="eyebrow">Sell your car</div>
        <h1 className="headline mt-2 text-[36px] sm:text-[52px]">List it in three minutes.</h1>
        <p className="mx-auto mt-3 max-w-md text-[17px] text-mute">
          {pausedText ?? "Listing is free. Create an account with your email so buyers can reach you and you can manage offers from your dashboard."}
        </p>
        {pausedText ? (
          <div className="mt-8 flex justify-center">
            <Button size="lg" variant="secondary" href="/cars">Browse cars</Button>
          </div>
        ) : (
        <>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" variant="brand" onClick={() => setAuth(true, "customer")}>
            Create a free account
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setAuth(true)}>
            Sign in
          </Button>
        </div>
        <p className="mt-6 text-[14px] text-mute">
          Selling as a dealership?{" "}
          <button onClick={() => setAuth(true, "dealer")} className="text-link">
            Open a dealer account
          </button>
        </p>
        </>
        )}
      </Container>
    </div>
  );
}

function Wizard() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [d, setD] = useState<Draft>(initial);
  const [publishing, setPublishing] = useState(false);
  const [done, setDone] = useState(false);
  const user = useApp((s) => s.user);
  const up = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  // Arriving from the VIN check ("Sell this car") pre-fills the VIN box.
  useEffect(() => {
    const v = cleanVin(new URLSearchParams(window.location.search).get("vin") ?? "");
    if (isVin(v)) setD((x) => ({ ...x, vin: v }));
  }, []);

  const { params: rules } = useEngine("listings");
  const valid = [
    !!d.make && d.model.trim().length > 0 && !!d.body && (!rules.requireVin || isVin(cleanVin(d.vin))),
    !!d.mileage && !!d.color && !!d.city,
    d.photos.length >= 1,
    Number(d.price) > 0,
    true,
  ][step];

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const biz = useBusiness(user?.businessId);
  const addListing = useDB((s) => s.addListing);
  const [listingId, setListingId] = useState("");

  const publish = () =>
    act("listings", async (u) => {
      setPublishing(true);
      await sleep(900);
      const dealer = u.role === "dealer" && biz;
      const id = `${[d.year, d.make, d.model].join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36).slice(-5)}`;
      addListing({
        id, make: d.make, model: d.model.trim(), trim: (vinOk(d) && d.decoded?.trim) || `${d.transmission} · ${d.fuel}`, year: d.year, price: Number(d.price), condition: d.condition, body: (d.body || "Sedan") as Body,
        fuel: d.fuel as Car["fuel"], transmission: d.transmission, mileage: Number(d.mileage) || 0, state: d.state, city: d.city.trim(), color: d.color.trim(),
        engine: (vinOk(d) && d.decoded?.engine) || "—", vin: isVin(cleanVin(d.vin)) ? cleanVin(d.vin) : undefined, vinMatch: vinOk(d), img: d.photos[0], photos: d.photos.slice(0, Number(rules.maxPhotos)), sellerId: dealer ? biz.id : `u:${u.phone}`, sellerName: dealer ? biz.name : u.name,
        verified: true, inspected: false, dutyPaid: d.dutyPaid, negotiable: d.negotiable, featured: d.plan === "premium", postedDays: 0, views: 0,
        features: [d.accidentFree ? "Accident-free" : "", d.dutyPaid ? "Customs duty paid" : "", d.transmission].filter(Boolean),
        description: d.description.trim() || undefined,
      });
      setListingId(id);
      setPublishing(false);
      setDone(true);
    });

  if (done) return <Success d={d} id={listingId} dealer={user?.role === "dealer"} onAgain={() => { setD(initial); setStep(0); setDone(false); }} />;

  return (
    <div className="pt-[64px]">
      <Container className="max-w-[760px] pt-10 sm:pt-14">
        <div className="text-center">
          <div className="eyebrow">Sell your car</div>
          <h1 className="headline mt-2 text-[36px] sm:text-[52px]">List it in three minutes.</h1>
          <p className="mt-2 text-[17px] text-mute">Free to list. Reach 2.1M buyers every month.</p>
        </div>

        {/* Progress */}
        <div className="relative mt-10">
          <div className="absolute left-[10%] right-[10%] top-4 h-0.5 -translate-y-1/2 rounded-full bg-hair">
            <motion.div className="absolute inset-y-0 left-0 rounded-full bg-brand" animate={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} transition={{ duration: 0.6, ease: easeApple }} />
          </div>
          <div className="relative flex justify-between">
            {STEPS.map((s, k) => (
              <button
                key={s}
                disabled={k > step}
                onClick={() => go(k)}
                className={cn("flex flex-1 flex-col items-center gap-2 text-[12px] font-medium transition", k <= step ? "text-ink" : "text-faint")}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full text-[13px] ring-4 ring-paper transition-all duration-500 ease-apple",
                    k < step ? "bg-brand text-white" : k === step ? "scale-110 bg-ink text-white" : "bg-mist text-faint",
                  )}
                >
                  {k < step ? <Check className="h-4 w-4" strokeWidth={3} /> : k + 1}
                </span>
                <span className="hidden sm:block">{s}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-10">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.4, ease: easeApple }}
              className="rounded-[28px] bg-white p-6 shadow-card ring-1 ring-black/[0.03] sm:p-10"
            >
              {step === 0 && <StepVehicle d={d} up={up} />}
              {step === 1 && <StepDetails d={d} up={up} />}
              {step === 2 && <StepPhotos d={d} up={up} />}
              {step === 3 && <StepPrice d={d} up={up} />}
              {step === 4 && <StepReview d={d} phone={user?.phone} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => go(step - 1)} className={cn(step === 0 && "invisible")}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="lg" disabled={!valid} onClick={() => go(step + 1)}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="lg" variant="brand" loading={publishing} onClick={publish}>
              Publish listing
            </Button>
          )}
        </div>
      </Container>
    </div>
  );
}

type StepProps = { d: Draft; up: (p: Partial<Draft>) => void };

function StepTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-[26px] font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-[15px] text-mute">{sub}</p>
    </div>
  );
}

function VinAutofill({ d, up }: StepProps) {
  const required = !!useEngine("listings").params.requireVin;
  const decoder = useEngine("vin").running;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const vin = cleanVin(d.vin);
  const fresh = d.decoded?.vin === vin;

  const decode = async () => {
    if (!isVin(vin) || busy) return;
    setBusy(true);
    setError("");
    const r = await lookupVin(vin);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    const x = r.report;
    const body = toBody(x.body);
    const fuel = toFuel(x.fuel);
    const transmission = toTransmission(x.transmission);
    up({
      decoded: x,
      make: normalizeMake(x.make, MAKES),
      model: x.model || d.model,
      ...(x.year && x.year >= 2000 && x.year <= 2026 ? { year: x.year } : {}),
      ...(body ? { body } : {}),
      ...(fuel ? { fuel } : {}),
      ...(transmission ? { transmission } : {}),
    });
    toast({ title: "Filled from VIN", body: vinTitle(x), tone: "success" });
  };

  return (
    <div className="rounded-[22px] bg-mist p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
        <ScanLine className="h-4 w-4 text-link" /> {decoder ? "Autofill from VIN" : "VIN"} <span className="font-normal text-faint">· {required ? "required" : "optional"}</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          decode();
        }}
        className="mt-3 flex gap-2"
      >
        <Input
          value={vin}
          onChange={(e) => {
            up({ vin: e.target.value });
            setError("");
          }}
          placeholder="17-character VIN"
          spellCheck={false}
          autoCapitalize="characters"
          className="flex-1 bg-white font-mono uppercase tracking-[0.08em] placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
          aria-label="VIN"
        />
        <Button type="submit" variant={fresh ? "secondary" : "primary"} loading={busy} disabled={!isVin(vin) || fresh || !decoder}>
          {fresh ? <Check className="h-4 w-4" strokeWidth={3} /> : "Decode"}
        </Button>
      </form>
      {error ? (
        <p className="mt-2 text-[13px] text-[#c4314b]">{error}</p>
      ) : fresh && d.decoded ? (
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-brand-ink">
          <CircleCheckBig className="h-3.5 w-3.5" /> {vinTitle(d.decoded)}
          {d.decoded.trim && ` ${d.decoded.trim}`}
          {d.decoded.engine && <span className="text-mute"> · {d.decoded.engine}</span>}
        </p>
      ) : (
        <p className="mt-2 text-[12px] text-faint">On the dashboard by the windscreen, the driver&apos;s door frame or your customs papers. A matching VIN earns your listing a badge.</p>
      )}
    </div>
  );
}

function StepVehicle({ d, up }: StepProps) {
  return (
    <>
      <StepTitle title="What are you selling?" sub="Start with the basics — we'll do the rest." />
      <VinAutofill d={d} up={up} />
      <div className="mt-8 space-y-6">
        <div>
          <div className="mb-2 text-[13px] font-medium text-ink-2">Condition</div>
          <Segmented
            className="w-full"
            value={d.condition}
            onChange={(v) => up({ condition: v })}
            options={[
              { value: "Brand New", label: "Brand new" },
              { value: "Foreign Used", label: "Tokunbo" },
              { value: "Nigerian Used", label: "Nigerian used" },
            ]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Make">
            <Select value={d.make} onChange={(e) => up({ make: e.target.value })}>
              <option value="">Select make</option>
              {(d.make && !MAKES.includes(d.make) ? [d.make, ...MAKES] : MAKES).map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <Field label="Model">
            <Input placeholder="e.g. Camry, RX 350, Accord" value={d.model} onChange={(e) => up({ model: e.target.value })} />
          </Field>
        </div>
        <Field label="Year">
          <Select value={d.year} onChange={(e) => up({ year: Number(e.target.value) })}>
            {Array.from({ length: 27 }, (_, k) => 2026 - k).map((y) => (
              <option key={y}>{y}</option>
            ))}
          </Select>
        </Field>
        <div>
          <div className="mb-2 text-[13px] font-medium text-ink-2">Body type</div>
          <div className="flex flex-wrap gap-2">
            {BODIES.map((b) => (
              <Chip key={b} active={d.body === b} onClick={() => up({ body: b })}>
                {b}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function StepDetails({ d, up }: StepProps) {
  return (
    <>
      <StepTitle title="Tell buyers more." sub="Accurate details get 3× more serious enquiries." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mileage (km)">
          <Input inputMode="numeric" placeholder="e.g. 54000" value={d.mileage} onChange={(e) => up({ mileage: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <Field label="Colour">
          <Input placeholder="e.g. Midnight Black" value={d.color} onChange={(e) => up({ color: e.target.value })} />
        </Field>
        <Field label="Transmission">
          <Select value={d.transmission} onChange={(e) => up({ transmission: e.target.value as Draft["transmission"] })}>
            <option>Automatic</option>
            <option>Manual</option>
          </Select>
        </Field>
        <Field label="Fuel">
          <Select value={d.fuel} onChange={(e) => up({ fuel: e.target.value })}>
            {["Petrol", "Diesel", "Hybrid", "Electric", "CNG"].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
        </Field>
        <Field label="State">
          <Select value={d.state} onChange={(e) => up({ state: e.target.value })}>
            {STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="City / area">
          <Input placeholder="e.g. Lekki Phase 1" value={d.city} onChange={(e) => up({ city: e.target.value })} />
        </Field>
        <Field label="Description" className="sm:col-span-2" hint={`${d.description.length}/600`}>
          <textarea
            value={d.description}
            maxLength={600}
            onChange={(e) => up({ description: e.target.value })}
            rows={4}
            placeholder="Service history, recent repairs, why you're selling…"
            className="w-full resize-none rounded-xl border border-line bg-white px-4 py-3 text-[15px] outline-none transition focus:border-link focus:shadow-[0_0_0_4px_rgb(0_102_204/0.12)]"
          />
        </Field>
        <div className="space-y-1 sm:col-span-2">
          <Toggle checked={d.dutyPaid} onChange={(v) => up({ dutyPaid: v })} label="Customs duty fully paid" />
          <Toggle checked={d.accidentFree} onChange={(v) => up({ accidentFree: v })} label="No major accident history" />
        </div>
      </div>
    </>
  );
}

function StepPhotos({ d, up }: StepProps) {
  const maxPhotos = Number(useEngine("listings").params.maxPhotos);
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  // Photos are downscaled to data URLs so the listing survives a reload.
  const add = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    const picked = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, maxPhotos - d.photos.length));
    const urls = await Promise.all(picked.map((f) => compressImage(f, 1400, 0.74).catch(() => "")));
    setBusy(false);
    up({ photos: [...d.photos, ...urls.filter(Boolean)] });
  };
  return (
    <>
      <StepTitle title="Add photos." sub="Listings with 8+ clear photos sell twice as fast. The first photo is your cover." />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          add(e.dataTransfer.files);
        }}
        onClick={() => input.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed px-6 py-12 text-center transition-all duration-300",
          drag ? "scale-[1.01] border-brand bg-brand-soft" : "border-line hover:border-ink/40 hover:bg-mist/50",
        )}
      >
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mist">
          <ImagePlus className="h-7 w-7 text-ink-2" strokeWidth={1.5} />
        </span>
        <div className="mt-4 text-[17px] font-semibold">{busy ? "Optimising photos…" : "Drop photos here"}</div>
        <div className="text-[14px] text-mute">or click to browse · up to 8</div>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      </div>
      {d.photos.length > 0 && (
        <motion.div layout className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
          <AnimatePresence>
            {d.photos.map((p, k) => (
              <motion.div
                key={p}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-mist"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="h-full w-full object-cover" />
                {k === 0 && <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">Cover</span>}
                <button
                  onClick={() => up({ photos: d.photos.filter((x) => x !== p) })}
                  className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      <div className="mt-6 grid grid-cols-2 gap-2 text-[13px] text-mute sm:grid-cols-4">
        {["Front ¾ angle", "Rear ¾ angle", "Dashboard & odometer", "Engine bay"].map((t) => (
          <div key={t} className="flex items-center gap-2 rounded-xl bg-mist px-3 py-2">
            <Camera className="h-4 w-4 shrink-0" /> {t}
          </div>
        ))}
      </div>
    </>
  );
}

function StepPrice({ d, up }: StepProps) {
  const est = useMemo(() => estimate(d), [d]);
  const [thinking, setThinking] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setThinking(false), 1100);
    return () => clearTimeout(t);
  }, []);
  const price = Number(d.price);
  const pos = price ? Math.min(100, Math.max(0, ((price - est.low * 0.85) / (est.high * 1.15 - est.low * 0.85)) * 100)) : null;
  const plans = [
    { k: "free", l: "Standard", p: 0, s: "Listed for 30 days" },
    { k: "boost", l: "Boost", p: 7_500, s: "Top of search for 7 days · 4× views" },
    { k: "premium", l: "Premium", p: 20_000, s: "Homepage feature + free inspection badge" },
  ] as const;
  return (
    <>
      <StepTitle title="Set your price." sub="Based on recent sales of similar cars in Nigeria." />
      <div className="rounded-[22px] bg-gradient-to-br from-[#f3f8ff] to-[#eef6f1] p-6">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-link">
          <Sparkles className="h-4 w-4" /> Smart price estimate
        </div>
        <AnimatePresence mode="wait">
          {thinking ? (
            <motion.div key="t" exit={{ opacity: 0 }} className="mt-4 space-y-3">
              <div className="shimmer h-10 w-56 rounded-xl" />
              <div className="shimmer h-2 w-full rounded-full" />
            </motion.div>
          ) : (
            <motion.div key="r" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: easeApple }}>
              <div className="mt-3 text-[32px] font-semibold tracking-tight tabular-nums">
                {nairaShort(est.low)} – {nairaShort(est.high)}
              </div>
              <div className="relative mt-5 h-2 rounded-full bg-gradient-to-r from-[#ffd60a] via-[#30d158] to-[#0a84ff]">
                {pos !== null && (
                  <motion.div
                    className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-ink shadow"
                    animate={{ left: `${pos}%` }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </div>
              <div className="mt-2 flex justify-between text-[12px] text-mute">
                <span>Quick sale</span>
                <span>Fair</span>
                <span>Premium</span>
              </div>
              <button onClick={() => up({ price: String(est.mid) })} className="mt-4 text-[14px] font-medium text-link">
                Use suggested {naira(est.mid)}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Field label="Your asking price" className="mt-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[17px] text-mute">₦</span>
          <Input
            inputMode="numeric"
            className="h-14 pl-9 text-[20px] font-semibold tabular-nums"
            value={d.price ? Number(d.price).toLocaleString("en-NG") : ""}
            onChange={(e) => up({ price: e.target.value.replace(/\D/g, "") })}
            placeholder="0"
          />
        </div>
      </Field>
      <div className="mt-3">
        <Toggle checked={d.negotiable} onChange={(v) => up({ negotiable: v })} label="Open to offers" />
      </div>
      <div className="mt-8 text-[13px] font-medium text-ink-2">Visibility</div>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        {plans.map((p) => (
          <button
            key={p.k}
            onClick={() => up({ plan: p.k })}
            className={cn("relative rounded-2xl border-2 p-4 text-left transition", d.plan === p.k ? "border-ink" : "border-hair hover:border-line")}
          >
            {p.k === "boost" && (
              <span className="absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
                <Zap className="h-3 w-3" /> Popular
              </span>
            )}
            <div className="text-[15px] font-semibold">{p.l}</div>
            <div className="mt-0.5 text-[15px] font-semibold tabular-nums">{p.p ? naira(p.p) : "Free"}</div>
            <div className="mt-1 text-[12px] leading-snug text-mute">{p.s}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function StepReview({ d, phone }: { d: Draft; phone?: string }) {
  const rows: [string, string][] = [
    ["Vehicle", `${d.year} ${d.make} ${d.model}`],
    ...(isVin(cleanVin(d.vin)) ? ([["VIN", `${cleanVin(d.vin)}${vinOk(d) ? " · matched" : ""}`]] as [string, string][]) : []),
    ["Condition", d.condition],
    ["Body", d.body || "—"],
    ["Mileage", `${Number(d.mileage).toLocaleString()} km`],
    ["Transmission · Fuel", `${d.transmission} · ${d.fuel}`],
    ["Colour", d.color],
    ["Location", `${d.city}, ${d.state}`],
    ["Price", `${naira(Number(d.price))}${d.negotiable ? " · negotiable" : ""}`],
    ["Contact", phone ?? "Sign in to add your number"],
  ];
  return (
    <>
      <StepTitle title="Looking good." sub="Here's how buyers will see your listing." />
      {d.decoded && isVin(cleanVin(d.vin)) && !vinOk(d) && (
        <div className="mb-5 flex gap-3 rounded-2xl bg-[#fff8e6] p-4 text-[14px] text-ink-2">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <span>
            The VIN belongs to a <b>{vinTitle(d.decoded)}</b>, but the listing says {d.year} {d.make}. Buyers won&apos;t see the VIN-matched badge until they agree.
          </span>
        </div>
      )}
      <div className="overflow-hidden rounded-[22px] ring-1 ring-hair">
        <div className="aspect-[16/9] bg-mist">
          {d.photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.photos[0]} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="divide-y divide-hair">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-5 py-3 text-[15px]">
              <span className="text-mute">{k}</span>
              <span className="text-right font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Success({ d, id, dealer, onAgain }: { d: Draft; id: string; dealer: boolean; onAgain: () => void }) {
  useEffect(() => {
    toast({ title: "Listing published", body: `${d.year} ${d.make} ${d.model}`, tone: "success" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="pt-[64px]">
      <Container className="flex min-h-[70vh] max-w-xl flex-col items-center justify-center py-20 text-center">
        <div className="relative">
          {Array.from({ length: 14 }).map((_, k) => (
            <motion.span
              key={k}
              className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
              style={{ background: ["#30d158", "#0a84ff", "#ffd60a", "#ff375f"][k % 4] }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: Math.cos((k / 14) * Math.PI * 2) * 110, y: Math.sin((k / 14) * Math.PI * 2) * 110, opacity: 0, scale: 0.4 }}
              transition={{ duration: 1.1, ease: easeApple, delay: 0.25 }}
            />
          ))}
          <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}>
            <CircleCheckBig className="h-24 w-24 text-brand" strokeWidth={1.2} />
          </motion.div>
        </div>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7, ease: easeApple }} className="headline mt-8 text-[40px]">
          Your car is live.
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-3 text-[17px] text-mute">
          Your {d.year} {d.make} {d.model} is now visible to buyers across Nigeria. We&apos;ll notify you the moment someone messages.
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 flex gap-3">
          <Button href={`/cars/${id}`}>View listing</Button>
          <Button variant="secondary" href={dealer ? "/dashboard/inventory" : "/dashboard"}>Go to dashboard</Button>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-4">
          <button onClick={onAgain} className="text-[14px] text-link hover:underline">List another car</button>
        </motion.div>
      </Container>
    </div>
  );
}

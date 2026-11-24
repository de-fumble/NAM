"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Banknote, Ship, Umbrella, Check, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { blockGuest, toast } from "@/lib/store";
import { act, paused } from "@/lib/gate";
import { cn, monthlyPayment, naira, nairaShort, sleep } from "@/lib/utils";
import { Badge, Button, Container, Field, Input, Range, Segmented, Select, Ticker, Toggle, easeApple } from "./ui";

type Tab = "loan" | "insurance" | "duty";

export function Finance() {
  const sp = useSearchParams();
  const router = useRouter();
  const tab = (["loan", "insurance", "duty"].includes(sp.get("tab") ?? "") ? sp.get("tab") : "loan") as Tab;
  const setTab = (t: Tab) => router.replace(t === "loan" ? "/finance" : `/finance?tab=${t}`, { scroll: false });

  const head = {
    loan: { icon: Banknote, eyebrow: "Car loans", title: "Drive now. Pay over time.", sub: "Compare offers from partner lenders in one place. Pre-qualify in 2 minutes with no impact on your credit." },
    insurance: { icon: Umbrella, eyebrow: "Insurance", title: "Covered in two minutes.", sub: "Third-party or comprehensive cover from licensed insurers, with digital certificates delivered instantly." },
    duty: { icon: Ship, eyebrow: "Import duty estimator", title: "Know your landing cost.", sub: "Importing from the US, Canada or Europe? Estimate customs duty, levies and port charges before you bid." },
  }[tab];

  return (
    <div className="pt-[64px]">
      <Container className="max-w-[1000px] pt-10 sm:pt-14">
        <div className="flex justify-center">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "loan", label: "Loans" },
              { value: "insurance", label: "Insurance" },
              { value: "duty", label: "Import duty" },
            ]}
          />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.45, ease: easeApple }}>
            <div className="mx-auto mt-10 max-w-2xl text-center">
              <head.icon className="mx-auto h-10 w-10 text-brand" strokeWidth={1.4} />
              <div className="eyebrow mt-4">{head.eyebrow}</div>
              <h1 className="headline mt-2 text-balance text-[38px] sm:text-[56px]">{head.title}</h1>
              <p className="mt-3 text-balance text-[17px] text-mute sm:text-[19px]">{head.sub}</p>
            </div>
            <div className="mt-12">
              {tab === "loan" && <Loan />}
              {tab === "insurance" && <Insurance />}
              {tab === "duty" && <Duty />}
            </div>
          </motion.div>
        </AnimatePresence>
      </Container>
    </div>
  );
}

const LENDERS = [
  { name: "Lumen Auto Finance", rate: 23.5, max: 48, note: "Salary earners" },
  { name: "Kobo Credit", rate: 25.9, max: 60, note: "Business owners" },
  { name: "Ìlú Motors Capital", rate: 27.5, max: 36, note: "Fast approval · 48h" },
];

function Donut({ a, b }: { a: number; b: number }) {
  const total = a + b;
  const c = 2 * Math.PI * 15.5;
  const frac = total ? a / total : 1;
  return (
    <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#ffd60a" strokeWidth="4" />
      <motion.circle cx="18" cy="18" r="15.5" fill="none" stroke="#00875a" strokeWidth="4" strokeDasharray={c} animate={{ strokeDashoffset: c * (1 - frac) }} transition={{ duration: 0.6, ease: easeApple }} />
    </svg>
  );
}

function Loan() {
  const [price, setPrice] = useState(32_500_000);
  const [down, setDown] = useState(30);
  const [months, setMonths] = useState(36);
  const [lender, setLender] = useState(0);
  const [income, setIncome] = useState("");
  const [busy, setBusy] = useState(false);
  const L = LENDERS[lender];
  const term = Math.min(months, L.max);
  const principal = price * (1 - down / 100);
  const pm = monthlyPayment(principal, L.rate, term);
  const totalInterest = pm * term - principal;
  const afford = Number(income) ? pm <= Number(income) * 0.33 : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="rounded-[28px] bg-white p-6 shadow-card ring-1 ring-black/[0.03] sm:p-8">
        <Field label="Car price">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-mute">₦</span>
            <Input className="pl-8 text-[17px] font-semibold tabular-nums" inputMode="numeric" value={price.toLocaleString("en-NG")} onChange={(e) => setPrice(Number(e.target.value.replace(/\D/g, "")) || 0)} />
          </div>
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          {[12_000_000, 25_000_000, 45_000_000, 80_000_000].map((v) => (
            <button key={v} onClick={() => setPrice(v)} className={cn("rounded-full px-3 py-1.5 text-[13px] transition", price === v ? "bg-ink text-white" : "bg-mist hover:bg-hair")}>
              {nairaShort(v)}
            </button>
          ))}
        </div>
        <div className="mt-8">
          <div className="mb-2 flex justify-between text-[14px]"><span>Down payment</span><span className="font-semibold tabular-nums">{down}% · {nairaShort(price * down / 100)}</span></div>
          <Range value={down} min={20} max={80} step={5} onChange={setDown} />
        </div>
        <div className="mt-8">
          <div className="mb-2 flex justify-between text-[14px]"><span>Term</span><span className="font-semibold tabular-nums">{term} months{term < months && <span className="font-normal text-faint"> (max for lender)</span>}</span></div>
          <Range value={months} min={12} max={60} step={6} onChange={setMonths} />
        </div>
        <div className="mt-8 text-[13px] font-medium text-ink-2">Lender</div>
        <div className="mt-2 space-y-2">
          {LENDERS.map((l, k) => (
            <button key={l.name} onClick={() => setLender(k)} className={cn("flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition", lender === k ? "border-ink" : "border-hair hover:border-line")}>
              <span>
                <span className="block text-[15px] font-semibold">{l.name}</span>
                <span className="block text-[12px] text-mute">{l.note} · up to {l.max} months</span>
              </span>
              <span className="text-[15px] font-semibold tabular-nums">{l.rate}%</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">
        <div className="rounded-[28px] bg-[#0b0b0c] p-7 text-white">
          <div className="text-[13px] text-white/60">Estimated monthly payment</div>
          <div className="headline mt-1 text-[48px] tabular-nums">
            <Ticker value={pm} format={naira} />
          </div>
          <div className="mt-6 flex items-center gap-6">
            <Donut a={principal} b={totalInterest} />
            <div className="space-y-3 text-[13px]">
              <div><div className="flex items-center gap-2 text-white/60"><span className="h-2 w-2 rounded-full bg-brand" /> Loan amount</div><div className="text-[17px] font-semibold tabular-nums">{nairaShort(principal)}</div></div>
              <div><div className="flex items-center gap-2 text-white/60"><span className="h-2 w-2 rounded-full bg-[#ffd60a]" /> Total interest</div><div className="text-[17px] font-semibold tabular-nums">{nairaShort(totalInterest)}</div></div>
            </div>
          </div>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-card ring-1 ring-black/[0.03]">
          <h3 className="text-[17px] font-semibold">Pre-qualify</h3>
          <Field label="Monthly take-home income" className="mt-3">
            <Input inputMode="numeric" placeholder="₦" value={income ? Number(income).toLocaleString("en-NG") : ""} onChange={(e) => setIncome(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <AnimatePresence>
            {afford !== null && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className={cn("mt-3 text-[13px]", afford ? "text-brand-ink" : "text-gold")}>
                {afford ? "✓ This payment fits comfortably within lender guidelines (≤33% of income)." : `Lenders typically cap repayments at 33% of income. Try a bigger down payment or a car under ${nairaShort((Number(income) * 0.33 * price) / pm)}.`}
              </motion.p>
            )}
          </AnimatePresence>
          <Button
            className="mt-4 w-full"
            variant="brand"
            disabled={!income}
            loading={busy}
            onClick={async () => {
              if (paused("finance") || blockGuest()) return;
              setBusy(true);
              await sleep(1200);
              setBusy(false);
              toast({ title: "Application started", body: `${L.name} will contact you within 24 hours.`, tone: "success" });
            }}
          >
            Check my eligibility
          </Button>
          <p className="mt-3 text-center text-[11px] text-faint">Indicative rates. Final terms depend on lender assessment.</p>
        </div>
      </div>
    </div>
  );
}

function Insurance() {
  const [value, setValue] = useState(25_000_000);
  const [type, setType] = useState<"third" | "comp">("comp");
  const [flood, setFlood] = useState(true);
  const [tracker, setTracker] = useState(false);
  const [excess, setExcess] = useState(true);
  const thirdParty = 15_000;
  const base = value * 0.035;
  const comp = base + (flood ? value * 0.005 : 0) + (excess ? value * 0.0025 : 0) - (tracker ? base * 0.1 : 0);
  const premium = type === "third" ? thirdParty : comp;
  const insurers = [
    { n: "Sentinel Assurance", m: 1, perks: "Claims settled in 72h" },
    { n: "Harbour Mutual", m: 1.06, perks: "Free towing nationwide" },
    { n: "Crestline Insurance", m: 0.97, perks: "Courtesy car for 7 days" },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="rounded-[28px] bg-white p-6 shadow-card ring-1 ring-black/[0.03] sm:p-8">
        <Segmented className="w-full" value={type} onChange={setType} options={[{ value: "third", label: "Third-party" }, { value: "comp", label: "Comprehensive" }]} />
        <AnimatePresence mode="wait">
          {type === "third" ? (
            <motion.div key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6 text-[15px] text-ink-2">
              <p>The legal minimum for every car on Nigerian roads. Covers damage or injury you cause to other people and their property — not your own car.</p>
              <ul className="mt-4 space-y-2">
                {["Digital certificate in minutes", "Verifiable on NIID", "Accepted by FRSC & VIO"].map((x) => (
                  <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 text-brand" strokeWidth={3} /> {x}</li>
                ))}
              </ul>
            </motion.div>
          ) : (
            <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6">
              <Field label="Car value">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-mute">₦</span>
                  <Input className="pl-8 font-semibold tabular-nums" inputMode="numeric" value={value.toLocaleString("en-NG")} onChange={(e) => setValue(Number(e.target.value.replace(/\D/g, "")) || 0)} />
                </div>
              </Field>
              <div className="mt-6 space-y-1">
                <Toggle checked={flood} onChange={setFlood} label="Flood & natural disaster cover" />
                <Toggle checked={excess} onChange={setExcess} label="Excess buy-back" />
                <Toggle checked={tracker} onChange={setTracker} label="I have a GPS tracker (−10%)" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="space-y-3">
        {insurers.map((i, k) => {
          const p = type === "third" ? thirdParty : comp * i.m;
          return (
            <motion.div key={i.n} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.08, duration: 0.5, ease: easeApple }} className="flex items-center justify-between gap-4 rounded-[22px] bg-white p-5 shadow-card ring-1 ring-black/[0.03]">
              <div>
                <div className="flex items-center gap-2 text-[16px] font-semibold">{i.n} {k === 2 && type === "comp" && <Badge tone="brand">Best price</Badge>}</div>
                <div className="text-[13px] text-mute">{i.perks}</div>
              </div>
              <div className="text-right">
                <div className="text-[19px] font-semibold tabular-nums"><Ticker value={p} format={naira} /></div>
                <div className="text-[11px] text-faint">per year</div>
              </div>
            </motion.div>
          );
        })}
        <Button className="w-full" size="lg" onClick={() => act("finance", () => toast({ title: "Quote saved", body: `From ${naira(premium * 0.97)} / year`, tone: "success" }))}>
          Get covered <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-center text-[11px] text-faint">Indicative premiums. Final price confirmed after vehicle details and inspection.</p>
      </div>
    </div>
  );
}

function Duty() {
  const [fob, setFob] = useState(12_000);
  const [freight, setFreight] = useState(1_800);
  const [fx, setFx] = useState(1_550);
  const [kind, setKind] = useState("car");
  const [route, setRoute] = useState<"lagos" | "cotonou">("lagos");

  const rates = kind === "car" ? { duty: 0.2, levy: 0.15 } : kind === "suv" ? { duty: 0.2, levy: 0.15 } : { duty: 0.1, levy: 0 };
  const ins = fob * 0.015;
  const cif = (fob + freight + ins) * fx;
  const duty = cif * rates.duty;
  const levy = cif * rates.levy;
  const surcharge = duty * 0.07;
  const ciss = fob * fx * 0.01;
  const etls = cif * 0.005;
  const vat = (cif + duty + levy + surcharge + ciss + etls) * 0.075;
  const customs = duty + levy + surcharge + ciss + etls + vat;
  const port = route === "lagos" ? 1_350_000 : 2_100_000;
  const landed = cif + customs + port;

  const rows: [string, number][] = [
    ["Import duty", duty],
    ["Levy", levy],
    ["Surcharge (7% of duty)", surcharge],
    ["CISS (1% of FOB)", ciss],
    ["ETLS (0.5% of CIF)", etls],
    ["VAT (7.5%)", vat],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="space-y-5 rounded-[28px] bg-white p-6 shadow-card ring-1 ring-black/[0.03] sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vehicle price (USD, FOB)">
            <Input inputMode="numeric" value={fob.toLocaleString()} onChange={(e) => setFob(Number(e.target.value.replace(/\D/g, "")) || 0)} />
          </Field>
          <Field label="Shipping (USD)">
            <Input inputMode="numeric" value={freight.toLocaleString()} onChange={(e) => setFreight(Number(e.target.value.replace(/\D/g, "")) || 0)} />
          </Field>
          <Field label="Exchange rate (₦ per $1)" hint="Use the current customs (CBN) rate">
            <Input inputMode="numeric" value={fx.toLocaleString()} onChange={(e) => setFx(Number(e.target.value.replace(/\D/g, "")) || 0)} />
          </Field>
          <Field label="Vehicle type">
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="car">Passenger car</option>
              <option value="suv">SUV / Jeep</option>
              <option value="commercial">Commercial / bus</option>
            </Select>
          </Field>
        </div>
        <div>
          <div className="mb-2 text-[13px] font-medium text-ink-2">Route</div>
          <Segmented className="w-full" value={route} onChange={setRoute} options={[{ value: "lagos", label: "Lagos ports (Apapa / Tin Can)" }, { value: "cotonou", label: "Via Cotonou" }]} />
        </div>
        <p className="rounded-2xl bg-[#fff8e6] p-4 text-[13px] leading-relaxed text-ink-2">
          This is an estimate based on the standard tariff structure. Rates, valuation and exchange rates change — always confirm the final figure with a licensed clearing agent before paying.
        </p>
      </div>

      <div className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">
        <div className="rounded-[28px] bg-[#0b0b0c] p-7 text-white">
          <div className="text-[13px] text-white/60">Estimated landed cost</div>
          <div className="headline mt-1 text-[44px] tabular-nums"><Ticker value={landed} format={nairaShort} /></div>
          <div className="mt-1 text-[13px] text-white/50">{naira(landed)}</div>
          <dl className="mt-6 space-y-2 text-[14px]">
            <div className="flex justify-between"><dt className="text-white/60">CIF value</dt><dd className="tabular-nums">{naira(cif)}</dd></div>
            {rows.map(([l, v]) => (
              <div key={l} className="flex justify-between"><dt className="text-white/60">{l}</dt><dd className="tabular-nums">{naira(v)}</dd></div>
            ))}
            <div className="flex justify-between"><dt className="text-white/60">Port, terminal & agent (est.)</dt><dd className="tabular-nums">{naira(port)}</dd></div>
            <div className="flex justify-between border-t border-white/10 pt-3 font-semibold"><dt>Customs total</dt><dd className="tabular-nums">{naira(customs)}</dd></div>
          </dl>
        </div>
        <Button href="/services?c=Clearing+Agent" variant="outline" size="lg" className="w-full">
          Find a licensed clearing agent
        </Button>
      </div>
    </div>
  );
}

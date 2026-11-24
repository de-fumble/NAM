"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck, Calendar, Check, CircleCheckBig, ClipboardCheck, Clock, FileText, KeyRound, MapPin, Paintbrush, Plus, Search, Ship, Sparkles, Thermometer, Truck, UserRound, Wrench, Zap, CircleDot,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { STATES } from "@/lib/data/cars";
import { PRO_CATEGORIES, PROS, REVIEWS, type Pro, type ProCategory } from "@/lib/data/pros";
import { useStock } from "@/lib/db";
import { toast, useReady } from "@/lib/store";
import { act } from "@/lib/gate";
import { cn, img, naira, nairaShort, sleep } from "@/lib/utils";
import { ProCard } from "./cards";
import { Avatar, Badge, Button, Container, Field, Img, Input, Reveal, Segmented, Select, Sheet, Skeleton, Stars, Toggle, easeApple } from "./ui";

const CAT_ICON: Record<ProCategory, typeof Wrench> = {
  Mechanic: Wrench, Inspection: ClipboardCheck, "Auto Electrician": Zap, "Panel Beater": Paintbrush, "AC Repair": Thermometer, Detailing: Sparkles,
  Vulcanizer: CircleDot, Driver: UserRound, "Clearing Agent": Ship, "Tracker Install": MapPin, Paperwork: FileText,
};

export function ServicesHub() {
  const sp = useSearchParams();
  const [cat, setCat] = useState<ProCategory | "">((sp.get("c") as ProCategory) || "");
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [state, setState] = useState("");
  const [mobile, setMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(false);
  // Pro profiles are sample data until pro accounts launch.
  const stock = useStock();

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 380);
    return () => clearTimeout(t);
  }, [cat, q, state, mobile]);

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return (stock ? PROS : []).filter(
      (p) =>
        (!cat || p.category === cat) &&
        (!state || p.state === state) &&
        (!mobile || p.mobile) &&
        words.every((w) => `${p.name} ${p.title} ${p.category} ${p.city} ${p.state} ${p.skills.join(" ")}`.toLowerCase().includes(w)),
    ).sort((a, b) => Number(b.topRated) - Number(a.topRated) || b.rating - a.rating);
  }, [cat, q, state, mobile, stock]);

  return (
    <div className="pt-[64px]">
      <section className="relative overflow-hidden bg-[#0b0b0c] text-white">
        <Img src={img("1615906655593-ad0386982a0f", 2000, { h: 900 })} alt="" className="absolute inset-0 !bg-black" imgClassName="opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/10" />
        <Container className="relative py-16 sm:py-24">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: easeApple }} className="max-w-xl">
            <div className="text-[13px] font-semibold text-[#ffd60a]">Services</div>
            <h1 className="headline mt-2 text-[40px] sm:text-[60px]">The right pro. Right where you are.</h1>
            <p className="mt-4 text-[17px] text-white/70 sm:text-[19px]">
              Hire vetted mechanics, inspectors and agents — or post a job and get quotes in minutes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="light" size="lg" onClick={() => act("services", () => setPost(true))}>
                <Plus className="h-4 w-4" /> Post a job — free
              </Button>
              <Button variant="ghost" size="lg" className="text-white hover:bg-white/10" href="#pros">
                Browse pros
              </Button>
            </div>
          </motion.div>
        </Container>
      </section>

      <Container className="pt-14">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {PRO_CATEGORIES.slice(0, 12).map((c, i) => {
            const Icon = CAT_ICON[c.key];
            const active = cat === c.key;
            return (
              <Reveal key={c.key} delay={i * 0.03} y={12}>
                <button
                  onClick={() => setCat(active ? "" : c.key)}
                  className={cn(
                    "flex h-full w-full flex-col items-start rounded-[20px] p-4 text-left transition-all duration-300 ease-apple",
                    active ? "bg-ink text-white shadow-float" : "bg-white shadow-card ring-1 ring-black/[0.03] hover:-translate-y-0.5",
                  )}
                >
                  <Icon className={cn("h-6 w-6", active ? "text-[#30d158]" : "text-brand")} strokeWidth={1.6} />
                  <div className="mt-3 text-[14px] font-semibold leading-tight">{c.label}</div>
                  <div className={cn("mt-0.5 text-[12px]", active ? "text-white/60" : "text-faint")}>{c.blurb}</div>
                </button>
              </Reveal>
            );
          })}
        </div>

        <div id="pros" className="sticky top-[64px] z-20 -mx-5 mt-12 scroll-mt-16 bg-paper/85 px-5 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-full bg-white px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-link/50">
              <Search className="h-4 w-4 text-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search skills, e.g. ‘Lexus gearbox’" className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint" />
            </div>
            <div className="w-44">
              <Select value={state} onChange={(e) => setState(e.target.value)} className="h-11 rounded-full text-[14px]">
                <option value="">All states</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <div className="w-auto rounded-full bg-white px-4 ring-1 ring-line">
              <Toggle checked={mobile} onChange={setMobile} label={<span className="text-[14px]">Comes to me</span>} />
            </div>
          </div>
        </div>

        <div className="mb-6 mt-4 flex items-center gap-2 text-[14px] text-mute">
          {loading ? "Finding pros…" : `${list.length} pros${cat ? ` · ${cat}` : ""}`}
          {cat && <button onClick={() => setCat("")} className="text-link">Clear</button>}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[230px] rounded-[24px]" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-[28px] bg-white py-16 text-center shadow-card">
            <h3 className="text-[21px] font-semibold">{stock ? "No pros match — yet." : "Pros are joining now."}</h3>
            <p className="mt-1 text-mute">{stock ? "Post your job and we'll invite pros from nearby states." : "Verified mechanics, inspectors and agents are being onboarded. Post your job to be first in line."}</p>
            <Button className="mt-6" onClick={() => act("services", () => setPost(true))}>Post a job</Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: easeApple, delay: i * 0.04 }}>
                <ProCard pro={p} />
              </motion.div>
            ))}
          </div>
        )}
      </Container>

      <PostJobSheet open={post} onClose={() => setPost(false)} />
    </div>
  );
}

/* ------------------------------- Post a job ------------------------------- */

function PostJobSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [stage, setStage] = useState<"form" | "sending" | "quotes" | "posted">("form");
  const stock = useStock();
  const [cat, setCat] = useState<ProCategory>("Mechanic");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [state, setState] = useState("Lagos");
  const [when, setWhen] = useState<"today" | "week" | "flexible">("today");
  const [budget, setBudget] = useState("");
  const [quotes, setQuotes] = useState<Pro[]>([]);

  useEffect(() => {
    if (!open) return;
    setStage("form");
    setQuotes([]);
  }, [open]);

  const submit = async () => {
    setStage("sending");
    await sleep(1400);
    // On live data there are no sample pros to quote, so the job is simply recorded as posted.
    if (!stock) return setStage("posted");
    setStage("quotes");
    const pool = [...PROS.filter((p) => p.category === cat), ...PROS.filter((p) => p.category !== cat && p.mobile)].slice(0, 3);
    for (const p of pool) {
      await sleep(1100);
      setQuotes((q) => [...q, p]);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={stage === "quotes" ? "Quotes are coming in" : "Post a job"} wide>
      <AnimatePresence mode="wait">
        {stage === "form" && (
          <motion.div key="f" exit={{ opacity: 0, x: -20 }} className="space-y-5 pb-2">
            <Field label="What do you need?">
              <Select value={cat} onChange={(e) => setCat(e.target.value as ProCategory)}>
                {PRO_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="Job title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Camry 2015 overheating, need diagnosis" />
            </Field>
            <Field label="Details">
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                placeholder="Describe the problem, your car and anything the pro should know."
                className="w-full resize-none rounded-xl border border-line px-4 py-3 text-[15px] outline-none transition focus:border-link focus:shadow-[0_0_0_4px_rgb(0_102_204/0.12)]"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Location">
                <Select value={state} onChange={(e) => setState(e.target.value)}>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Budget (optional)">
                <Input inputMode="numeric" placeholder="₦" value={budget ? Number(budget).toLocaleString() : ""} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ""))} />
              </Field>
            </div>
            <div>
              <div className="mb-2 text-[13px] font-medium text-ink-2">When?</div>
              <Segmented className="w-full" value={when} onChange={setWhen} options={[{ value: "today", label: "Today" }, { value: "week", label: "This week" }, { value: "flexible", label: "Flexible" }]} />
            </div>
            <Button size="lg" className="w-full" disabled={!title.trim()} onClick={submit}>
              Get quotes
            </Button>
          </motion.div>
        )}
        {stage === "sending" && (
          <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-16 text-center">
            <div className="relative h-20 w-20">
              {[0, 1, 2].map((k) => (
                <motion.span
                  key={k}
                  className="absolute inset-0 rounded-full border-2 border-brand"
                  initial={{ scale: 0.4, opacity: 0.8 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: k * 0.5, ease: "easeOut" }}
                />
              ))}
              <span className="absolute inset-0 grid place-items-center">
                <Wrench className="h-8 w-8 text-brand" />
              </span>
            </div>
            <p className="mt-6 text-[17px] font-medium">Notifying top-rated pros in {state}…</p>
          </motion.div>
        )}
        {stage === "posted" && (
          <motion.div key="p" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-12 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-brand/10 text-brand"><Check className="h-8 w-8" strokeWidth={2.5} /></span>
            <h3 className="mt-5 text-[22px] font-semibold tracking-tight">You&apos;re first in line</h3>
            <p className="mt-2 max-w-sm text-[15px] text-mute">Pro services are opening in {state} soon. Verified pros will be able to quote on jobs like this as soon as they join.</p>
            <Button className="mt-6" onClick={onClose}>Done</Button>
          </motion.div>
        )}
        {stage === "quotes" && (
          <motion.div key="q" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-2">
            <p className="text-[15px] text-mute">“{title}” · {state}. Compare and hire the one that suits you.</p>
            <div className="mt-5 space-y-3">
              <AnimatePresence>
                {quotes.map((p, k) => {
                  const price = Math.round((p.from * (1.2 + k * 0.25)) / 500) * 500;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 20, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 26 }}
                      className="flex items-center gap-4 rounded-2xl p-4 ring-1 ring-hair"
                    >
                      <Avatar name={p.name} hue={p.hue} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 text-[15px] font-semibold">
                          {p.name} <BadgeCheck className="h-4 w-4 text-link" />
                        </div>
                        <div className="text-[12px] text-mute">★ {p.rating.toFixed(2)} · {p.jobs} jobs · can start {k === 0 ? "in 1 hour" : k === 1 ? "this afternoon" : "tomorrow"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[17px] font-semibold tabular-nums">{naira(price)}</div>
                        <button
                          onClick={() => {
                            toast({ title: `${p.name.split(" ")[0]} hired`, body: "They'll message you shortly.", tone: "success" });
                            onClose();
                          }}
                          className="mt-1 rounded-full bg-ink px-3 py-1 text-[12px] font-medium text-white"
                        >
                          Hire
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {quotes.length < 3 && (
                <div className="flex items-center gap-3 rounded-2xl p-4 ring-1 ring-dashed ring-line">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <span className="text-[12px] text-faint">Waiting for quote…</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

/* ------------------------------- Pro profile ------------------------------- */

/** Pro pages are sample profiles: on live data they show as unavailable. */
export function ProPage({ pro }: { pro: Pro }) {
  const stock = useStock();
  const hydrated = useReady();
  if (stock || !hydrated) return <ProProfile pro={pro} />;
  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center pt-[64px] text-center">
      <h1 className="headline text-[40px]">This pro isn&apos;t available.</h1>
      <p className="mt-2 text-[17px] text-mute">Pro services are opening soon.</p>
      <Button href="/services" className="mt-6">Back to services</Button>
    </Container>
  );
}

export function ProProfile({ pro }: { pro: Pro }) {
  const [pkg, setPkg] = useState(1);
  const [book, setBook] = useState(false);
  const p = pro.packages[pkg];
  return (
    <div className="pt-[64px]">
      <Container className="pt-8">
        <Link href="/services" className="text-[13px] text-link">← All services</Link>
        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: easeApple }} className="flex items-start gap-5">
              <Avatar name={pro.name} hue={pro.hue} size={88} />
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-[30px] font-semibold leading-tight tracking-[-0.03em] sm:text-[36px]">
                  {pro.name} <BadgeCheck className="h-6 w-6 shrink-0 text-link" />
                </h1>
                <p className="text-[17px] text-mute">{pro.title}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {pro.topRated && <Badge tone="gold">★ Top Rated</Badge>}
                  {pro.mobile && <Badge tone="brand">Comes to you</Badge>}
                  <Badge><MapPin className="h-3 w-3" /> {pro.city}, {pro.state}</Badge>
                  <Badge><Clock className="h-3 w-3" /> Replies in ~{pro.responseMins} min</Badge>
                </div>
              </div>
            </motion.div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                [pro.rating.toFixed(2), `${pro.reviews} reviews`],
                [pro.jobs.toLocaleString(), "jobs completed"],
                [`${pro.years} yrs`, "experience"],
              ].map(([a, b]) => (
                <div key={b} className="rounded-[20px] bg-white p-4 text-center shadow-card ring-1 ring-black/[0.03]">
                  <div className="text-[24px] font-semibold tracking-tight">{a}</div>
                  <div className="text-[12px] text-faint">{b}</div>
                </div>
              ))}
            </div>

            <Reveal className="mt-10">
              <h2 className="text-[24px] font-semibold tracking-tight">About</h2>
              <p className="mt-3 text-[17px] leading-relaxed text-ink-2">{pro.bio}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {pro.skills.map((s) => (
                  <span key={s} className="rounded-full bg-mist px-3 py-1.5 text-[13px] font-medium">{s}</span>
                ))}
              </div>
            </Reveal>

            <Reveal className="mt-10">
              <h2 className="text-[24px] font-semibold tracking-tight">Recent work</h2>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {pro.portfolio.map((id, k) => (
                  <Img key={k} src={img(id, 600, { h: 600 })} alt="" className="aspect-square rounded-2xl" />
                ))}
              </div>
            </Reveal>

            <Reveal className="mt-10">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[24px] font-semibold tracking-tight">Reviews</h2>
                <span className="flex items-center gap-1.5 text-[14px] text-mute"><Stars value={pro.rating} /> {pro.rating.toFixed(2)}</span>
              </div>
              <div className="mt-4 divide-y divide-hair">
                {REVIEWS.map((r) => (
                  <div key={r.name} className="py-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.name} hue={r.name.length * 40} size={36} />
                      <div>
                        <div className="text-[14px] font-semibold">{r.name}</div>
                        <div className="flex items-center gap-2 text-[12px] text-faint"><Stars value={r.rating} size={10} /> {r.when}</div>
                      </div>
                    </div>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{r.text}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <aside className="lg:sticky lg:top-[88px] lg:self-start">
            <div className="rounded-[28px] bg-white p-6 shadow-card ring-1 ring-black/[0.03]">
              <Segmented className="w-full" size="sm" value={String(pkg)} onChange={(v) => setPkg(Number(v))} options={pro.packages.map((x, k) => ({ value: String(k), label: x.name }))} />
              <AnimatePresence mode="wait">
                <motion.div key={pkg} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="mt-6">
                  <div className="text-[34px] font-semibold tracking-tight tabular-nums">{naira(p.price)}</div>
                  <p className="mt-2 text-[15px] text-ink-2">{p.desc}</p>
                  <div className="mt-4 flex items-center gap-4 text-[13px] text-mute">
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {p.eta}</span>
                    {pro.mobile && <span className="flex items-center gap-1"><Truck className="h-4 w-4" /> At your location</span>}
                  </div>
                  <ul className="mt-5 space-y-2 text-[14px]">
                    {["Photos of all replaced parts", "30-day workmanship guarantee"].map((x) => (
                      <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 text-brand" strokeWidth={3} /> {x}</li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
              <Button size="lg" className="mt-6 w-full" onClick={() => act("services", () => setBook(true))}>
                Book {pro.name.split(" ")[0]}
              </Button>
              <Button size="lg" variant="secondary" className="mt-2 w-full" onClick={() => act("services", () => toast({ title: "Message sent", body: `${pro.name.split(" ")[0]} usually replies in ~${pro.responseMins} min.`, tone: "success" }))}>
                Message
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-[20px] bg-brand-soft p-4 text-[13px] text-brand-ink">
              <KeyRound className="h-5 w-5 shrink-0" /> Identity, address and guarantor verified by Naija Auto Market.
            </div>
          </aside>
        </div>
      </Container>
      <BookSheet open={book} onClose={() => setBook(false)} pro={pro} pkg={p} />
    </div>
  );
}

function BookSheet({ open, onClose, pro, pkg }: { open: boolean; onClose: () => void; pro: Pro; pkg: Pro["packages"][number] }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [date, setDate] = useState("");
  const [addr, setAddr] = useState("");
  useEffect(() => {
    if (open) setDone(false);
  }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title={done ? "" : `Book ${pkg.name}`}>
      {done ? (
        <div className="flex flex-col items-center py-8 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 15 }}>
            <CircleCheckBig className="h-16 w-16 text-brand" strokeWidth={1.3} />
          </motion.div>
          <h3 className="mt-4 text-[24px] font-semibold tracking-tight">Request sent to {pro.name.split(" ")[0]}.</h3>
          <p className="mt-2 max-w-xs text-[15px] text-mute">They&apos;ll confirm the {naira(pkg.price)} job and the time shortly.</p>
          <Button className="mt-6" onClick={onClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-5 pb-2 pt-1">
          <div className="flex items-center gap-3 rounded-2xl bg-mist p-3">
            <Avatar name={pro.name} hue={pro.hue} size={40} />
            <div className="flex-1">
              <div className="text-[15px] font-semibold">{pro.name}</div>
              <div className="text-[13px] text-mute">{pkg.name} · {pkg.eta}</div>
            </div>
            <div className="text-[17px] font-semibold tabular-nums">{nairaShort(pkg.price)}</div>
          </div>
          <Field label="Preferred date">
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <Input type="date" className="pl-11" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </Field>
          {pro.mobile && (
            <Field label="Where should they come?">
              <Input placeholder="Address or landmark" value={addr} onChange={(e) => setAddr(e.target.value)} />
            </Field>
          )}
          <Button
            size="lg"
            variant="brand"
            className="w-full"
            disabled={!date || (pro.mobile && !addr)}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await sleep(1100);
              setBusy(false);
              setDone(true);
            }}
          >
            Confirm & pay {naira(pkg.price)}
          </Button>
        </div>
      )}
    </Sheet>
  );
}

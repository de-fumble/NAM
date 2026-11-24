"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CircleAlert, Info, RotateCcw, ScanLine, ShieldCheck, Tag, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { MAKES } from "@/lib/data/cars";
import { blockGuest, useApp, useReady } from "@/lib/store";
import { getEngine, useEngine } from "@/lib/db";
import { paused } from "@/lib/gate";
import { cn } from "@/lib/utils";
import { cleanVin, isVin, lookupVin, normalizeMake, SAMPLE_VIN, vinTitle, type VinReport, type VinResult } from "@/lib/vin";
import { Button, Container, Spinner, easeApple } from "./ui";

type Fail = Extract<VinResult, { ok: false }>;

export function Verify() {
  const [val, setVal] = useState("");
  const [stage, setStage] = useState<"idle" | "running" | "done" | "error">("idle");
  const [report, setReport] = useState<VinReport | null>(null);
  const [fail, setFail] = useState<Fail | null>(null);
  const clean = cleanVin(val);
  const valid = isVin(clean);
  const ready = useReady();
  const signedIn = useApp((s) => !!s.user);
  // Admin → Engines → VIN check: on/off, and whether guests can run checks.
  const needAccount = !!useEngine("vin").params.requireSignIn;

  const run = async (vin = clean) => {
    if (!isVin(vin) || paused("vin")) return;
    if (getEngine("vin").params.requireSignIn && blockGuest()) return;
    setStage("running");
    const [r] = await Promise.all([lookupVin(vin), new Promise((ok) => setTimeout(ok, 700))]);
    if (!r.ok && r.code === "SIGN_IN") {
      setStage("idle");
      return void blockGuest();
    }
    if (r.ok) {
      setReport(r.report);
      setStage("done");
    } else {
      setFail(r);
      setStage("error");
    }
  };

  // /verify?vin=… (from a listing or a shared link) fills the VIN, and runs it for signed-in users.
  // Waits for the stores to load so we know whether someone is signed in.
  useEffect(() => {
    if (!ready) return;
    const v = cleanVin(new URLSearchParams(window.location.search).get("vin") ?? "");
    if (!isVin(v)) return;
    setVal(v);
    if (useApp.getState().user || !getEngine("vin").params.requireSignIn) run(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const reset = () => {
    setStage("idle");
    setVal("");
    setReport(null);
    setFail(null);
  };

  return (
    <div className="pt-[64px]">
      <Container className="max-w-[760px] pt-12 sm:pt-20">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: easeApple }} className="text-center">
          <ScanLine className="mx-auto h-10 w-10 text-link" strokeWidth={1.4} />
          <h1 className="headline mt-4 text-balance text-[40px] sm:text-[60px]">Know exactly what you’re buying.</h1>
          <p className="mx-auto mt-3 max-w-lg text-balance text-[17px] text-mute sm:text-[19px]">
            Enter the VIN and see the year, make, model, engine and factory spec — then make sure it matches the car and its papers.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {stage === "idle" && (
            <motion.div key="i" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5, ease: easeApple }} className="mt-12">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run();
                }}
                className="rounded-[28px] bg-white p-3 shadow-float ring-1 ring-black/[0.04]"
              >
                <input
                  value={clean}
                  onChange={(e) => setVal(e.target.value)}
                  placeholder="17-character VIN"
                  aria-label="VIN"
                  spellCheck={false}
                  autoCapitalize="characters"
                  className="h-16 w-full rounded-2xl bg-transparent px-5 text-center font-mono text-[18px] uppercase tracking-[0.1em] outline-none placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-faint sm:text-[24px] sm:tracking-[0.12em]"
                  autoFocus
                />
                <div className="mx-5 mb-3 flex gap-[3px]">
                  {Array.from({ length: 17 }).map((_, k) => (
                    <span key={k} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", k < clean.length ? "bg-link" : "bg-hair")} />
                  ))}
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={!valid}>
                  Check VIN · Free
                </Button>
                {ready && !signedIn && needAccount && <p className="mt-2 text-center text-[12px] text-faint">Free with an account. You&apos;ll be asked to sign in.</p>}
              </form>
              <div className="mt-4 text-center text-[13px] text-mute">
                No VIN handy?{" "}
                <button
                  onClick={() => {
                    setVal(SAMPLE_VIN);
                    run(SAMPLE_VIN);
                  }}
                  className="text-link"
                >
                  Try a sample
                </button>
                <span className="mx-2 text-line">·</span>Find it on the dashboard by the windscreen, the driver’s door frame or the customs papers.
              </div>
            </motion.div>
          )}

          {stage === "running" && (
            <motion.div key="r" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mt-12 rounded-[28px] bg-white p-10 text-center shadow-float ring-1 ring-black/[0.04]">
              <Spinner size={28} className="mx-auto text-link" />
              <div className="mt-5 font-mono text-[15px] tracking-[0.12em] text-ink-2">{clean}</div>
              <div className="mt-1 text-[14px] text-mute">Decoding the manufacturer and factory spec…</div>
            </motion.div>
          )}

          {stage === "error" && fail && (
            <motion.div key="e" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: easeApple }} className="mt-12">
              <div className="rounded-[28px] bg-white p-8 text-center shadow-float ring-1 ring-black/[0.04]">
                <CircleAlert className="mx-auto h-9 w-9 text-gold" strokeWidth={1.6} />
                <h2 className="mt-3 text-[22px] font-semibold tracking-tight">
                  {fail.code === "NOT_FOUND" ? "No vehicle found for this VIN" : fail.code === "INVALID" ? "That isn’t a valid VIN" : "Couldn’t check right now"}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-[15px] text-mute">{fail.message}</p>
                <div className="mt-2 font-mono text-[14px] tracking-[0.1em] text-faint">{clean}</div>
                {fail.code === "NOT_FOUND" && (
                  <p className="mx-auto mt-4 max-w-md rounded-2xl bg-mist p-4 text-left text-[13px] text-ink-2">
                    A VIN that won’t decode is a warning sign on a car for sale. Compare every character with the plate on the dashboard and the customs papers before you pay anything.
                  </p>
                )}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {fail.code !== "NOT_FOUND" && fail.code !== "INVALID" && (
                  <Button size="lg" className="sm:flex-1" onClick={() => run()}>
                    Try again
                  </Button>
                )}
                <Button size="lg" variant="secondary" className="sm:flex-1" onClick={reset}>
                  <RotateCcw className="h-4 w-4" /> Check another VIN
                </Button>
              </div>
            </motion.div>
          )}

          {stage === "done" && report && <Result key="d" r={report} onReset={reset} />}
        </AnimatePresence>
      </Container>
    </div>
  );
}

function Result({ r, onReset }: { r: VinReport; onReset: () => void }) {
  const make = normalizeMake(r.make, MAKES);
  const rows: [string, string | number | null][] = [
    ["Year", r.year && r.yearAmbiguous ? `${r.year} (check papers)` : r.year],
    ["Make", make],
    ["Model", r.model],
    ["Trim", r.trim],
    ["Body", r.body],
    ["Engine", r.engine],
    ["Transmission", r.transmission],
    ["Drive", r.drive],
    ["Fuel", r.fuel === "Gasoline" ? "Petrol" : r.fuel],
    ["Doors", r.doors],
    ["Built in", r.origin],
    ["Manufacturer", r.manufacturer],
  ];
  const shown = rows.filter(([, v]) => v !== null && v !== "");
  const inCatalogue = MAKES.includes(make);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: easeApple }} className="mt-12">
      <div className="overflow-hidden rounded-[28px] bg-white shadow-float ring-1 ring-black/[0.04]">
        <div className="bg-brand-soft p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <ShieldCheck className="h-8 w-8 shrink-0 text-brand" />
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-brand-ink">VIN decoded</div>
              <h2 className="mt-0.5 text-[26px] font-semibold leading-tight tracking-tight sm:text-[30px]">{vinTitle(r)}</h2>
              {r.trim && <p className="mt-0.5 text-[15px] text-ink-2">{r.trim}</p>}
              <p className="mt-2 break-all font-mono text-[14px] tracking-[0.1em] text-ink-2">{r.vin}</p>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-px bg-hair sm:grid-cols-3">
          {shown.map(([k, v]) => (
            <div key={k} className="bg-white px-6 py-4">
              <dt className="text-[12px] text-mute">{k}</dt>
              <dd className="mt-0.5 text-[15px] font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="space-y-3 border-t border-hair p-6 sm:px-8">
          {r.checksum ? (
            <Note icon={ShieldCheck} tone="ok">The VIN’s check digit is valid, so it hasn’t been mistyped or altered.</Note>
          ) : (
            <Note icon={TriangleAlert} tone="warn">
              The check digit doesn’t add up. That’s normal for many cars built for Europe and Asia, but on a US import it can mean the VIN was mistyped or altered. Compare it carefully.
            </Note>
          )}
          {r.yearAmbiguous && <Note icon={TriangleAlert} tone="warn">This VIN pattern can belong to more than one model year. Confirm the year on the papers.</Note>}
          <Note icon={Info} tone="info">
            This check confirms the factory details only. It doesn’t cover accident, customs or theft history, so match the VIN on the car to its customs papers before you pay.
          </Note>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {inCatalogue && (
          <Button size="lg" className="sm:flex-1" href={`/cars?make=${encodeURIComponent(make)}${r.model ? `&q=${encodeURIComponent(r.model)}` : ""}`}>
            <Tag className="h-4 w-4" /> Find a {make} {r.model} for sale
          </Button>
        )}
        <Button size="lg" variant={inCatalogue ? "secondary" : "primary"} className="sm:flex-1" href={`/sell?vin=${r.vin}`}>
          Sell this car <ArrowRight className="h-4 w-4" />
        </Button>
        <Button size="lg" variant="secondary" className="sm:flex-1" onClick={onReset}>
          <RotateCcw className="h-4 w-4" /> Check another
        </Button>
      </div>
    </motion.div>
  );
}

function Note({ icon: Icon, tone, children }: { icon: typeof Info; tone: "ok" | "warn" | "info"; children: React.ReactNode }) {
  return (
    <p className="flex gap-3 text-[14px] leading-relaxed text-ink-2">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone === "ok" ? "text-brand" : tone === "warn" ? "text-gold" : "text-mute")} />
      <span>{children}</span>
    </p>
  );
}

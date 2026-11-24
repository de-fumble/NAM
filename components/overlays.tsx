"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CircleAlert, CircleCheckBig, GitCompareArrows, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { DEMO_ACCOUNTS, ROLE_META } from "@/lib/data/businesses";
import { useAllCars, useDB, useEngine, useStock } from "@/lib/db";
import { initSync, startDemo } from "@/lib/sync";
import { useApp, useUI, toast, type User } from "@/lib/store";
import { cn, img } from "@/lib/utils";
import { AUTH_TITLES, AuthForm, AuthLinkCatcher, ROLE_ICON, type AuthMode } from "./auth";
import { Sheet, easeApple } from "./ui";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    Promise.all([useApp.persist.rehydrate(), useDB.persist.rehydrate()]).then(() => {
      useDB.getState().seed();
      useUI.getState().setHydrated();
      initSync();
    });
  }, []);
  return (
    <>
      <AuthLinkCatcher />
      {children}
    </>
  );
}

/* --------------------------------- Toaster --------------------------------- */

export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[76px] z-[100] flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={() => dismiss(t.id)}
            className="glass pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl py-2.5 pl-3 pr-4 shadow-float ring-1 ring-black/5"
          >
            {t.tone === "success" && <CircleCheckBig className="h-5 w-5 shrink-0 text-brand" />}
            {t.tone === "error" && <CircleAlert className="h-5 w-5 shrink-0 text-[#ff6961]" />}
            <div className="min-w-0">
              <div className="text-[14px] font-semibold">{t.title}</div>
              {t.body && <div className="truncate text-[13px] text-mute">{t.body}</div>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------------- Auth ---------------------------------- */

export { ROLE_ICON } from "./auth";

export function AuthSheet() {
  const open = useUI((s) => s.authOpen);
  const preset = useUI((s) => s.authRole);
  const setOpen = useUI((s) => s.setAuth);
  const signIn = useApp((s) => s.signIn);
  const router = useRouter();
  // Demo accounts only exist on stock data, and only while Admin → Engines → Demo accounts is on.
  const stockData = useStock();
  const demoOn = useEngine("demo").running;
  const stock = stockData && demoOn;
  const [mode, setMode] = useState<AuthMode>("signin");
  const [demoBusy, setDemoBusy] = useState("");
  // Remount the form each time the sheet opens so it starts fresh.
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (open) setNonce((n) => n + 1);
  }, [open]);

  const after = (u: User) => {
    setOpen(false);
    if (u.role !== "customer") router.push("/dashboard");
  };

  const demo = async (d: (typeof DEMO_ACCOUNTS)[number]) => {
    setDemoBusy(d.phone);
    const r = await startDemo(d.phone);
    setDemoBusy("");
    if (!r.ok) return toast({ title: "Couldn't open the demo", body: r.error, tone: "error" });
    signIn(r.user ?? { name: d.name, phone: d.phone, role: d.role, businessId: d.businessId });
    setOpen(false);
    toast({ title: `Signed in as ${d.name}`, body: `${ROLE_META[d.role].label} demo account`, tone: "success" });
    router.push("/dashboard");
  };

  const showDemo = stock && (mode === "signin" || mode === "role");

  return (
    <Sheet open={open} onClose={() => setOpen(false)} title={AUTH_TITLES[mode]} wide={showDemo || mode === "role"}>
      <div className={cn("grid gap-8 pb-2 pt-2", showDemo && "sm:grid-cols-[1fr_260px]")}>
        <div className="min-w-0">
          <AuthForm key={nonce} initial={preset ? "signup" : "signin"} presetRole={preset} onMode={setMode} onDone={after} />
        </div>
        {showDemo && (
          <div className="sm:border-l sm:border-hair sm:pl-8">
            <div className="text-[13px] font-semibold text-ink-2">Or explore a demo account</div>
            <p className="mt-1 text-[13px] text-mute">No sign-up needed. Each one opens its own dashboard.</p>
            <div className="mt-4 space-y-2">
              {DEMO_ACCOUNTS.map((d) => {
                const Icon = ROLE_ICON[d.role];
                return (
                  <button
                    key={d.role}
                    onClick={() => demo(d)}
                    disabled={!!demoBusy}
                    className="group flex w-full items-center gap-3 rounded-2xl p-2.5 text-left ring-1 ring-hair transition hover:bg-mist hover:ring-line disabled:opacity-60"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mist text-ink transition group-hover:bg-white">
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold">{d.name}</span>
                      <span className="block text-[12px] text-mute">{ROLE_META[d.role].label}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ------------------------------ Compare tray ------------------------------ */

export function CompareTray() {
  const ids = useApp((s) => s.compare);
  const toggle = useApp((s) => s.toggleCompare);
  const clear = useApp((s) => s.clearCompare);
  const allCars = useAllCars();
  const pathname = usePathname();
  const show = ids.length > 0 && pathname !== "/compare" && pathname !== "/cart" && !pathname.startsWith("/sell") && !pathname.startsWith("/dashboard");
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-x-0 bottom-[76px] z-30 flex justify-center px-4 sm:bottom-6"
        >
          <div className="glass-dark flex items-center gap-3 rounded-full py-2 pl-2 pr-2 text-white shadow-float">
            <div className="flex -space-x-2">
              {ids.map((id) => {
                const c = allCars.find((x) => x.id === id);
                if (!c) return null;
                return (
                  <button key={id} onClick={() => toggle(id)} className="group relative" aria-label={`Remove ${c.model}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img(c.img, 100, { h: 100, q: 60 })} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-[#1d1d1f]" />
                    <span className="absolute inset-0 grid place-items-center rounded-full bg-black/60 opacity-0 transition group-hover:opacity-100">
                      <X className="h-3.5 w-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
            <span className="hidden text-[14px] sm:inline">{ids.length} of 3 to compare</span>
            <Link href="/compare" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-medium text-ink transition hover:bg-white/90">
              <GitCompareArrows className="h-4 w-4" /> Compare <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button onClick={clear} className="grid h-9 w-9 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white" aria-label="Clear">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

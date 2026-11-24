"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CarFront, Heart, House, LogOut, Menu, Plus, Search, ShoppingBag, User, Wrench, X, Cog } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp, useUI } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ROLE_META } from "@/lib/data/businesses";
import { useBusiness } from "@/lib/db";
import { Avatar, Logo, easeApple } from "./ui";

export const NAV_LINKS = [
  { href: "/cars", label: "Buy" },
  { href: "/sell", label: "Sell" },
  { href: "/parts", label: "Parts" },
  { href: "/services", label: "Services" },
  { href: "/rentals", label: "Rentals" },
  { href: "/finance", label: "Finance" },
  { href: "/verify", label: "Verify" },
];

function useScrolled(threshold: number) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const on = () => setV(window.scrollY > threshold);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [threshold]);
  return v;
}

export function Nav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const pastHero = useScrolled(isHome ? 560 : 4);
  const dark = isHome && !pastHero;
  const [open, setOpen] = useState(false);
  const [acct, setAcct] = useState(false);

  const savedCount = useApp((s) => s.saved.length);
  const bagCount = useApp((s) => s.cart.reduce((a, l) => a + l.qty, 0));
  const user = useApp((s) => s.user);
  const signOut = useApp((s) => s.signOut);
  const setPalette = useUI((s) => s.setPalette);
  const setAuth = useUI((s) => s.setAuth);
  const biz = useBusiness(user?.businessId);
  const isBiz = !!user && user.role !== "customer";

  useEffect(() => {
    setOpen(false);
    setAcct(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const iconBtn = cn(
    "relative grid h-9 w-9 place-items-center rounded-full transition-colors duration-300",
    dark ? "text-white/85 hover:bg-white/10 hover:text-white" : "text-ink/80 hover:bg-black/5 hover:text-ink",
  );

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-500 ease-apple",
          open ? "bg-paper" : dark ? "glass-dark border-b border-white/5" : "glass border-b",
          !dark && !open && (pastHero ? "border-black/[0.08]" : "border-transparent"),
        )}
      >
        <nav className="mx-auto flex h-[64px] max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
          <Logo dark={dark && !open} size={50} />

          <ul className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={cn(
                      "relative rounded-full px-3 py-1.5 text-[13px] transition-colors duration-300",
                      dark ? (active ? "text-white" : "text-white/70 hover:text-white") : active ? "text-ink" : "text-ink/70 hover:text-ink",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className={cn("absolute inset-0 -z-10 rounded-full", dark ? "bg-white/10" : "bg-black/[0.05]")}
                        transition={{ type: "spring", stiffness: 400, damping: 34 }}
                      />
                    )}
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-0.5">
            {isBiz ? (
              <Link
                href="/dashboard"
                className={cn(
                  "mr-1 hidden h-8 items-center rounded-full px-3.5 text-[13px] font-medium transition md:inline-flex",
                  dark ? "bg-white text-ink hover:bg-white/90" : "bg-ink text-white hover:bg-black",
                )}
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/business"
                className={cn("mr-1 hidden rounded-full px-3 py-1.5 text-[13px] transition xl:inline-flex", dark ? "text-white/70 hover:text-white" : "text-ink/70 hover:text-ink")}
              >
                For business
              </Link>
            )}
            <button
              onClick={() => setPalette(true)}
              className={cn(
                iconBtn,
                "lg:flex lg:w-auto lg:items-center lg:gap-2 lg:px-3",
              )}
              aria-label="Search"
            >
              <Search className="h-[17px] w-[17px]" />
              <kbd className={cn("hidden rounded-md px-1.5 py-0.5 font-sans text-[11px] lg:block", dark ? "bg-white/10 text-white/60" : "bg-black/5 text-mute")}>⌘K</kbd>
            </button>
            <Link href="/saved" className={cn(iconBtn, "hidden sm:grid")} aria-label="Saved">
              <Heart className="h-[17px] w-[17px]" />
              <Count n={savedCount} />
            </Link>
            <Link href="/cart" className={iconBtn} aria-label="Bag">
              <ShoppingBag className="h-[17px] w-[17px]" />
              <Count n={bagCount} />
            </Link>
            <div className="relative hidden sm:block">
              {user ? (
                <button onClick={() => setAcct((v) => !v)} className="ml-1 grid h-9 w-9 place-items-center" aria-label="Account">
                  <Avatar name={user.name} size={28} />
                </button>
              ) : (
                <button onClick={() => setAuth(true)} className={iconBtn} aria-label="Sign in">
                  <User className="h-[17px] w-[17px]" />
                </button>
              )}
              <AnimatePresence>
                {acct && user && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.25, ease: easeApple }}
                    className="absolute right-0 top-11 w-64 origin-top-right rounded-2xl bg-white p-2 shadow-float ring-1 ring-black/5"
                  >
                    <div className="px-3 py-2.5">
                      <div className="truncate text-[15px] font-semibold">{biz?.name ?? user.name}</div>
                      <div className="truncate text-[13px] text-mute">{ROLE_META[user.role].label} · {user.email ?? user.phone}</div>
                    </div>
                    <div className="my-1 h-px bg-hair" />
                    {(
                      [
                        ["/dashboard", "Dashboard"],
                        ...(isBiz
                          ? [[`/store/${user.businessId}`, "View my storefront"], ["/dashboard/messages", "Messages"], ["/dashboard/settings", "Business settings"]]
                          : [["/dashboard/orders", "Orders"], ["/dashboard/bookings", "Bookings"], ["/dashboard/messages", "Messages"], ["/saved", "Saved cars"]]),
                      ] as [string, string][]
                    ).map(([h, l]) => (
                      <Link key={h} href={h} className="block rounded-xl px-3 py-2 text-[14px] hover:bg-mist">
                        {l}
                      </Link>
                    ))}
                    <button
                      onClick={() => {
                        signOut();
                        setAcct(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[14px] text-[#d70015] hover:bg-mist"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button onClick={() => setOpen((v) => !v)} className={cn(iconBtn, "lg:hidden", open && "!text-ink")} aria-label="Menu">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={String(open)}
                  initial={{ opacity: 0, rotate: -45 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 45 }}
                  transition={{ duration: 0.2 }}
                >
                  {open ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="fixed inset-0 z-40 overflow-y-auto bg-paper px-8 pb-28 pt-20 lg:hidden"
          >
            <ul className="space-y-1">
              {[{ href: "/", label: "Home" }, ...NAV_LINKS, { href: "/dashboard", label: "Dashboard" }, { href: "/business", label: "For business" }, { href: "/saved", label: "Saved" }].map((l, i) => (
                <motion.li
                  key={l.href}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * i + 0.05, duration: 0.4, ease: easeApple }}
                >
                  <Link href={l.href} className="block py-2 text-[28px] font-semibold tracking-tight text-ink">
                    {l.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-8 border-t border-hair pt-6">
              {user ? (
                <button onClick={() => signOut()} className="text-[17px] text-mute">
                  Sign out of {user.name}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setOpen(false);
                    setAuth(true);
                  }}
                  className="text-[17px] font-medium text-link"
                >
                  Sign in or create account
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Count({ n }: { n: number }) {
  return (
    <AnimatePresence>
      {n > 0 && (
        <motion.span
          key={n}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 20 }}
          className="absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white"
        >
          {n}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* ----------------------------- Mobile tab bar ----------------------------- */

const TABS = [
  { href: "/", label: "Explore", icon: House },
  { href: "/cars", label: "Buy", icon: CarFront },
  { href: "/sell", label: "Sell", icon: Plus, primary: true },
  { href: "/parts", label: "Parts", icon: Cog },
  { href: "/services", label: "Pros", icon: Wrench },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.08] pb-[env(safe-area-inset-bottom)] sm:hidden">
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <li key={t.href}>
              <Link href={t.href} className="flex flex-col items-center gap-0.5 pb-1.5 pt-2">
                <span className="grid h-7 place-items-center">
                  {t.primary ? (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-white">
                      <Icon className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <Icon className={cn("h-[22px] w-[22px] transition-colors", active ? "text-brand" : "text-faint")} strokeWidth={active ? 2.2 : 1.8} />
                  )}
                </span>
                <span className={cn("text-[10px] font-medium", active ? "text-brand" : "text-faint")}>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

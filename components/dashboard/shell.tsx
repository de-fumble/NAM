"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  BadgeCheck, CalendarDays, CarFront, ClipboardList, ExternalLink, Heart, Inbox, KeyRound, LayoutDashboard, MessageSquare, Package, Repeat, Settings, Store, UsersRound, Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { DEMO_ACCOUNTS, ROLE_META, type Role } from "@/lib/data/businesses";
import { useBusiness, useDB, useStock } from "@/lib/db";
import { useApp, useUI, useReady } from "@/lib/store";
import { cn, img } from "@/lib/utils";
import { ROLE_ICON } from "../overlays";
import { Avatar, Button, Logo, Skeleton, easeApple } from "../ui";

export type SectionId =
  | "overview" | "orders" | "bookings" | "messages" | "requests" | "saved" | "settings" | "inventory" | "leads" | "payouts" | "fleet" | "products";

export const SECTIONS: Record<Role, { id: SectionId; label: string; icon: LucideIcon }[]> = {
  customer: [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: Package },
    { id: "bookings", label: "Bookings", icon: CalendarDays },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "requests", label: "Part requests", icon: ClipboardList },
    { id: "saved", label: "Saved", icon: Heart },
    { id: "settings", label: "Account", icon: Settings },
  ],
  dealer: [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "inventory", label: "Inventory", icon: CarFront },
    { id: "leads", label: "Leads", icon: UsersRound },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "payouts", label: "Payouts", icon: Wallet },
    { id: "settings", label: "Storefront", icon: Store },
  ],
  rental: [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "bookings", label: "Bookings", icon: CalendarDays },
    { id: "fleet", label: "Fleet", icon: KeyRound },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "payouts", label: "Payouts", icon: Wallet },
    { id: "settings", label: "Storefront", icon: Store },
  ],
  parts: [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: Inbox },
    { id: "products", label: "Products", icon: Package },
    { id: "requests", label: "Part requests", icon: ClipboardList },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "payouts", label: "Payouts", icon: Wallet },
    { id: "settings", label: "Storefront", icon: Store },
  ],
};

export function useSection(): SectionId {
  const p = useParams<{ section?: string }>();
  return (p.section as SectionId) ?? "overview";
}

/** Badge counts per section — what needs attention. */
function useBadges(): Partial<Record<SectionId, number>> {
  const user = useApp((s) => s.user);
  const threads = useDB((s) => s.threads);
  const leads = useDB((s) => s.leads);
  const orders = useDB((s) => s.orders);
  const bookings = useDB((s) => s.bookings);
  const requests = useDB((s) => s.requests);
  if (!user) return {};
  const biz = user.businessId;
  if (user.role === "customer") {
    const mine = (p: { phone: string }) => p.phone === user.phone;
    return {
      messages: threads.filter((t) => mine(t.customer)).reduce((a, t) => a + t.unreadCust, 0),
      requests: requests.filter((r) => mine(r.customer) && r.status === "open").reduce((a, r) => a + r.quotes.length, 0),
    };
  }
  return {
    messages: threads.filter((t) => t.businessId === biz).reduce((a, t) => a + t.unreadBiz, 0),
    leads: leads.filter((l) => l.businessId === biz && l.stage === "new").length,
    orders: orders.filter((o) => o.fulfil[biz!] === "placed").length,
    bookings: bookings.filter((b) => b.companyId === biz && b.status === "pending").length,
    requests: requests.filter((r) => r.status === "open" && !r.quotes.some((q) => q.businessId === biz)).length,
  };
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const hydrated = useReady();
  const user = useApp((s) => s.user);
  const section = useSection();
  const pathname = usePathname();
  const biz = useBusiness(user?.businessId);
  const badges = useBadges();
  const setAuth = useUI((s) => s.setAuth);

  if (!hydrated)
    return (
      <div className="mx-auto flex max-w-[1400px] gap-8 px-5 pt-[96px] sm:px-8">
        <Skeleton className="hidden h-[480px] w-60 rounded-[24px] lg:block" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-[22px]" />)}
          </div>
          <Skeleton className="h-72 rounded-[24px]" />
        </div>
      </div>
    );

  if (!user) return <SignInGate />;

  const nav = SECTIONS[user.role];
  const RoleIcon = ROLE_ICON[user.role];
  const isBiz = user.role !== "customer";

  return (
    <div className="min-h-dvh pt-[64px]">
      <div className="mx-auto flex max-w-[1400px] gap-8 px-5 sm:px-8">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-[88px] pb-10">
            <div className="overflow-hidden rounded-[22px] bg-white shadow-card ring-1 ring-black/[0.03]">
              {isBiz && biz ? (
                <div className="relative h-16">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img(biz.cover, 480, { h: 128 })} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              ) : (
                <div className="h-16 bg-gradient-to-br from-[#e7f5ee] to-[#d2efe1]" />
              )}
              <div className="relative -mt-7 px-4 pb-4">
                <Avatar name={biz?.name ?? user.name} hue={biz?.hue ?? 150} size={52} className="ring-4 ring-white" />
                <div className="mt-2 flex items-center gap-1 text-[15px] font-semibold leading-tight tracking-tight">
                  <span className="truncate">{biz?.name ?? user.name}</span>
                  {biz?.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-link" />}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[12px] text-mute">
                  <RoleIcon className="h-3.5 w-3.5" /> {ROLE_META[user.role].label}
                </div>
                {isBiz && (
                  <Link href={`/store/${user.businessId}`} className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-link hover:underline">
                    View storefront <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>

            <nav className="mt-4 space-y-0.5">
              {nav.map((n) => {
                const active = n.id === section;
                const count = badges[n.id];
                return (
                  <Link
                    key={n.id}
                    href={n.id === "overview" ? "/dashboard" : `/dashboard/${n.id}`}
                    className={cn("relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors", active ? "text-ink" : "text-ink-2 hover:bg-black/[0.03]")}
                  >
                    {active && (
                      <motion.span layoutId="dash-nav" className="absolute inset-0 rounded-xl bg-white shadow-card ring-1 ring-black/[0.04]" transition={{ type: "spring", stiffness: 420, damping: 36 }} />
                    )}
                    <n.icon className={cn("relative h-[18px] w-[18px]", active ? "text-brand" : "text-faint")} strokeWidth={1.8} />
                    <span className="relative flex-1">{n.label}</span>
                    {!!count && <span className="relative grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">{count}</span>}
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={() => setAuth(true)}
              className="mt-6 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-mute transition hover:bg-black/[0.03] hover:text-ink"
            >
              <Repeat className="h-4 w-4" /> Switch account
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-28 pt-6 lg:pt-8">
          {/* Mobile section switcher */}
          <div className="no-scrollbar sticky top-[64px] z-20 -mx-5 mb-6 flex gap-1.5 overflow-x-auto bg-paper/85 px-5 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:hidden">
            {nav.map((n) => {
              const active = n.id === section;
              const count = badges[n.id];
              return (
                <Link
                  key={n.id}
                  href={n.id === "overview" ? "/dashboard" : `/dashboard/${n.id}`}
                  className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition", active ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-hair")}
                >
                  <n.icon className="h-4 w-4" strokeWidth={1.8} />
                  {n.label}
                  {!!count && <span className={cn("grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold", active ? "bg-white text-ink" : "bg-brand text-white")}>{count}</span>}
                </Link>
              );
            })}
          </div>
          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: easeApple }}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function SignInGate() {
  const setAuth = useUI((s) => s.setAuth);
  const stock = useStock();
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center px-6 pt-[64px] text-center">
      <Logo size={120} href={null} />
      <h1 className="headline mt-6 text-[36px] sm:text-[44px]">Your dashboard awaits.</h1>
      <p className="mt-3 text-[17px] text-mute">Buyers track orders, bookings and messages. Dealers, rental companies and parts sellers run their business here.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={() => setAuth(true)}>
          Sign in
        </Button>
        <Button size="lg" variant="outline" href="/business">
          Sell on Naija Auto
        </Button>
      </div>
      {stock && <>
      <div className="mt-10 grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
        {DEMO_ACCOUNTS.map((d) => {
          const Icon = ROLE_ICON[d.role];
          return (
            <button key={d.role} onClick={() => setAuth(true)} className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center shadow-card ring-1 ring-black/[0.03] transition hover:-translate-y-0.5">
              <Icon className="h-5 w-5 text-brand" strokeWidth={1.7} />
              <span className="text-[12px] font-medium leading-tight">{ROLE_META[d.role].label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] text-faint">Demo accounts are available in the sign-in sheet.</p>
      </>}
    </div>
  );
}

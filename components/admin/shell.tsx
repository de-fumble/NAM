"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2, CalendarDays, CarFront, Check, ClipboardList, Cog, Copy, Database, ExternalLink, KeyRound, LayoutDashboard, LogOut, MessageSquare,
  Package, Power, ScrollText, Settings, ShieldCheck, UsersRound, Target, type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button, Field, Input, Logo, Skeleton, Spinner, easeApple } from "../ui";
import { ConfirmHost, PipelineBadge, adminApi, usePipeline, type DataMode } from "./kit";

export type AdminSection =
  | "overview" | "users" | "businesses" | "cars" | "parts" | "fleet" | "orders" | "bookings" | "leads" | "messages" | "requests" | "engines" | "settings" | "audit";

export const ADMIN_NAV: { group: string; items: { id: AdminSection; label: string; icon: LucideIcon }[] }[] = [
  { group: "", items: [{ id: "overview", label: "Overview", icon: LayoutDashboard }] },
  { group: "People", items: [{ id: "users", label: "Users", icon: UsersRound }, { id: "businesses", label: "Businesses", icon: Building2 }] },
  {
    group: "Catalogue",
    items: [{ id: "cars", label: "Car listings", icon: CarFront }, { id: "parts", label: "Parts", icon: Cog }, { id: "fleet", label: "Rental fleet", icon: KeyRound }],
  },
  {
    group: "Activity",
    items: [
      { id: "orders", label: "Orders", icon: Package },
      { id: "bookings", label: "Bookings", icon: CalendarDays },
      { id: "leads", label: "Leads", icon: Target },
      { id: "messages", label: "Messages", icon: MessageSquare },
      { id: "requests", label: "Part requests", icon: ClipboardList },
    ],
  },
  {
    group: "Platform",
    items: [{ id: "engines", label: "Engines", icon: Power }, { id: "settings", label: "Settings", icon: Settings }, { id: "audit", label: "Audit log", icon: ScrollText }],
  },
];

export function useAdminSection(): AdminSection {
  const p = useParams<{ section?: string }>();
  return (p.section as AdminSection) ?? "overview";
}

type Status = { tables: boolean; seeded: boolean; mode?: DataMode; authReady?: boolean };

export function AdminShell({ email, sql, authSql, children }: { email: string; sql: string; authSql: string; children: ReactNode }) {
  const section = useAdminSection();
  const pathname = usePathname();
  const [status, setStatus] = useState<Status | null>(null);
  const [err, setErr] = useState("");
  const setMode = usePipeline((s) => s.setMode);
  const check = () =>
    adminApi<Status>("status")
      .then((r) => {
        setStatus(r);
        if (r.mode) setMode(r.mode);
      })
      .catch((e) => setErr(e.message));
  useEffect(() => void check(), []);

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin";
  };

  return (
    <div className="min-h-dvh bg-paper">
      <ConfirmHost />
      <div className="mx-auto flex max-w-[1480px] gap-8 px-5 sm:px-8">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-0 flex h-dvh flex-col py-6">
            <div className="flex items-center gap-3 px-2">
              <Logo size={44} href="/admin" />
              <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">Admin</span>
            </div>
            <PipelineBadge className="ml-2 mt-4 self-start" />
            <nav className="no-scrollbar mt-6 flex-1 space-y-5 overflow-y-auto">
              {ADMIN_NAV.map((g) => (
                <div key={g.group || "main"}>
                  {g.group && <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-faint">{g.group}</div>}
                  {g.items.map((n) => {
                    const active = n.id === section;
                    return (
                      <Link
                        key={n.id}
                        href={n.id === "overview" ? "/admin" : `/admin/${n.id}`}
                        className={cn("relative flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium transition-colors", active ? "text-ink" : "text-ink-2 hover:bg-black/[0.03]")}
                      >
                        {active && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-xl bg-white shadow-card ring-1 ring-black/[0.04]" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                        <n.icon className={cn("relative h-[18px] w-[18px]", active ? "text-brand" : "text-faint")} strokeWidth={1.8} />
                        <span className="relative">{n.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className="mt-4 border-t border-hair pt-4">
              <Link href="/" target="_blank" className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-mute hover:bg-black/[0.03] hover:text-ink">
                <ExternalLink className="h-4 w-4" /> Open marketplace
              </Link>
              <div className="mt-1 flex items-center justify-between gap-2 px-3 py-2">
                <span className="truncate text-[12px] text-faint">{email}</span>
                <button onClick={logout} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-mute hover:bg-mist hover:text-ink" aria-label="Sign out" title="Sign out">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24">
          {/* Mobile header + switcher */}
          <div className="sticky top-0 z-20 -mx-5 bg-paper/85 px-5 pb-3 pt-4 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Logo size={38} href="/admin" />
                <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Admin</span>
                <PipelineBadge />
              </div>
              <button onClick={logout} className="grid h-9 w-9 place-items-center rounded-full bg-white ring-1 ring-hair" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
            </div>
            <div className="no-scrollbar -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5">
              {ADMIN_NAV.flatMap((g) => g.items).map((n) => (
                <Link
                  key={n.id}
                  href={n.id === "overview" ? "/admin" : `/admin/${n.id}`}
                  className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium", n.id === section ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-hair")}
                >
                  <n.icon className="h-4 w-4" strokeWidth={1.8} /> {n.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-6 lg:pt-10">
            {err ? (
              <p className="rounded-2xl bg-[#fdecea] p-5 text-[14px] text-[#8c1d18]">{err}</p>
            ) : !status ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-[22px]" />)}</div>
                <Skeleton className="h-72 rounded-[24px]" />
              </div>
            ) : !status.tables || !status.seeded ? (
              <Setup sql={sql} tables={status.tables} onDone={check} />
            ) : (
              <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: easeApple }}>
                {status.authReady === false && <AuthMigration sql={authSql} onDone={check} />}
                {children}
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ───────────────────────────── Email sign-in update ───────────────────────────── */

function AuthMigration({ sql, onDone }: { sql: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const project = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(/https:\/\/([^.]+)/)?.[1];
  return (
    <div className="mb-6 rounded-[24px] bg-[#fff8e6] p-5 ring-1 ring-[#f5d77a]/60 sm:p-6">
      <div className="flex items-start gap-3">
        <Database className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold">One database update needed for email sign-in</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
            Until it&apos;s applied, nobody can create an account or sign in with email. Copy the SQL, paste it into the Supabase SQL Editor and press <b>Run</b>. It&apos;s safe to run more than once. File:{" "}
            <code className="rounded bg-white/70 px-1.5 py-0.5 text-[12px]">supabase/migrations/20261123090000_email_auth.sql</code>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(sql);
                setCopied(true);
                toast({ title: "SQL copied", tone: "success" });
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy SQL"}
            </Button>
            {project && (
              <Button size="sm" variant="outline" href={`https://supabase.com/dashboard/project/${project}/sql/new`}>
                Open SQL Editor <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onDone}>
              I&apos;ve run it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── First-run setup ───────────────────────────── */

function Setup({ sql, tables, onDone }: { sql: string; tables: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const project = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(/https:\/\/([^.]+)/)?.[1];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand"><Database className="h-6 w-6" /></span>
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Set up the database</h1>
          <p className="text-[15px] text-mute">Two steps, about a minute.</p>
        </div>
      </div>

      <ol className="mt-8 space-y-4">
        <li className={cn("rounded-[24px] bg-white p-6 shadow-card ring-1 ring-black/[0.03]", tables && "opacity-60")}>
          <div className="flex items-center gap-3">
            <Step n={1} done={tables} />
            <h2 className="text-[17px] font-semibold">Create the tables</h2>
          </div>
          {!tables && (
            <>
              <p className="mt-3 text-[14px] leading-relaxed text-mute">
                Copy the migration, open the Supabase SQL Editor, paste and press <b>Run</b>. It&apos;s safe to run more than once. File:{" "}
                <code className="rounded bg-mist px-1.5 py-0.5 text-[12px]">supabase/migrations/20261121120000_marketplace_schema.sql</code>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(sql);
                    setCopied(true);
                    toast({ title: "Migration copied", tone: "success" });
                  }}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy SQL"}
                </Button>
                {project && (
                  <Button variant="outline" href={`https://supabase.com/dashboard/project/${project}/sql/new`}>
                    Open SQL Editor <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" onClick={onDone}>I&apos;ve run it</Button>
              </div>
            </>
          )}
        </li>
        <li className={cn("rounded-[24px] bg-white p-6 shadow-card ring-1 ring-black/[0.03]", !tables && "opacity-50")}>
          <div className="flex items-center gap-3">
            <Step n={2} done={false} />
            <h2 className="text-[17px] font-semibold">Load the catalogue</h2>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-mute">
            Imports the cars, parts, rental fleet and businesses, plus demo orders, bookings and messages so every dashboard has something to show. Existing rows are never overwritten.
          </p>
          <Button
            className="mt-4"
            variant="brand"
            disabled={!tables}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await adminApi("seed");
                toast({ title: "Database ready", tone: "success" });
                onDone();
              } catch (e) {
                toast({ title: "Seeding failed", body: (e as Error).message, tone: "error" });
              }
              setBusy(false);
            }}
          >
            <ShieldCheck className="h-4 w-4" /> Load data
          </Button>
          <p className="mt-4 border-t border-hair pt-4 text-[13px] text-mute">
            Launching for real?{" "}
            <button
              disabled={!tables}
              className="font-medium text-link hover:underline disabled:opacity-40"
              onClick={async () => {
                try {
                  await adminApi("settings.set", { settings: { dataMode: "live" } });
                  toast({ title: "Running on live data", body: "Only real businesses and listings will appear.", tone: "success" });
                  onDone();
                } catch (e) {
                  toast({ title: "Couldn't switch", body: (e as Error).message, tone: "error" });
                }
              }}
            >
              Skip the sample data and start on live data
            </button>
            . You can switch any time in Settings.
          </p>
        </li>
      </ol>
    </div>
  );
}

function Step({ n, done }: { n: number; done: boolean }) {
  return (
    <span className={cn("grid h-8 w-8 place-items-center rounded-full text-[14px] font-semibold", done ? "bg-brand text-white" : "bg-ink text-white")}>
      {done ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
    </span>
  );
}

/* ───────────────────────────── Sign in ───────────────────────────── */

export function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Sign-in failed");
    router.refresh();
  };
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-5">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeApple }}
        className="w-full max-w-sm rounded-[28px] bg-white p-8 shadow-float ring-1 ring-black/[0.03]"
      >
        <div className="flex flex-col items-center text-center">
          <Logo size={84} href={null} />
          <h1 className="mt-5 text-[24px] font-semibold tracking-tight">Admin console</h1>
          <p className="mt-1 text-[14px] text-mute">Sign in with your administrator account.</p>
        </div>
        {!configured ? (
          <p className="mt-6 rounded-2xl bg-[#fff4d6] p-4 text-[13px] text-[#8a5a00]">Supabase isn&apos;t configured. Add the keys to <code>.env.local</code> and restart the server.</p>
        ) : (
          <div className="mt-7 space-y-4">
            <Field label="Email">
              <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Password">
              <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {error && <p className="text-[13px] text-[#b3261e]">{error}</p>}
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              Sign in
            </Button>
            <p className="text-center text-[12px] text-faint">
              No admin yet? Run <code className="rounded bg-mist px-1">npm run admin:create -- you@email.com</code>
            </p>
          </div>
        )}
        {busy && <span className="sr-only"><Spinner /></span>}
      </motion.form>
    </div>
  );
}

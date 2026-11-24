"use client";

/**
 * Admin → Engines: the control room for every switchable part of the marketplace (lib/engines.ts).
 * Each engine saves on its own: the switch saves straight away; schedule, message and rules save with "Save".
 */

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, BadgeCheck, CalendarClock, CalendarDays, CarFront, ChevronDown, ClipboardList, Cog, Construction, HandCoins, KeyRound, Landmark, Megaphone,
  MessageSquare, Power, RotateCcw, ScanLine, Search, UserPlus, UsersRound, Wrench, type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ENGINE_DEFS, engineStatus, fmtWhen, type EngineDef, type EngineGroup, type EngineKey, type Engines, type EngineState, type EngineStatus, type ParamDef,
} from "@/lib/engines";
import { cn, naira } from "@/lib/utils";
import { Button, Field, Input, Select, Toggle } from "../ui";
import { PageHead, Panel, Stat, Status, type Tone } from "../dashboard/kit";
import { toast } from "@/lib/store";
import { adminApi, confirm } from "./kit";

const ICONS: Record<EngineKey, LucideIcon> = {
  maintenance: Construction, announcement: Megaphone, signups: UserPlus, demo: UsersRound, listings: CarFront, messaging: MessageSquare,
  offers: HandCoins, inspections: BadgeCheck, parts: Cog, partRequests: ClipboardList, rentals: KeyRound, services: Wrench, finance: Landmark, vin: ScanLine,
};
const GROUPS: EngineGroup[] = ["Platform", "Accounts", "Marketplace", "Commerce", "Tools"];

/** How a status reads for the admin. Effect engines (maintenance, announcement) read the other way round. */
function badge(def: EngineDef, st: EngineStatus, s: EngineState): { tone: Tone; label: string } {
  if (def.effect) {
    if (st === "running") return def.key === "maintenance" ? { tone: "critical", label: "Site offline" } : { tone: "info", label: "Showing" };
    if (st === "scheduled") return { tone: "warning", label: `From ${fmtWhen(s.from!)}` };
    if (st === "closed") return { tone: "neutral", label: "Outside its hours" };
    if (st === "ended") return { tone: "neutral", label: "Window ended" };
    return { tone: "neutral", label: "Off" };
  }
  if (st === "running") return { tone: "good", label: s.until ? `Running until ${fmtWhen(s.until)}` : "Running" };
  if (st === "scheduled") return { tone: "warning", label: `Opens ${fmtWhen(s.from!)}` };
  if (st === "closed") return { tone: "warning", label: `Closed · opens ${s.hours?.start}` };
  if (st === "ended") return { tone: "critical", label: "Window ended" };
  return { tone: "critical", label: "Paused" };
}

/** A feature engine that isn't running is "down" for shoppers. Effect engines are down when they *are* running. */
const isAttention = (def: EngineDef, st: EngineStatus) => (def.effect ? def.key === "maintenance" && st === "running" : st !== "running");

/* ───────────────────────────── Screen ───────────────────────────── */

export function EnginesScreen() {
  const [engines, setEngines] = useState<Engines | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [, tick] = useState(0);
  const load = () =>
    adminApi<{ engines: Engines }>("engines.get")
      .then((r) => setEngines(r.engines))
      .catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    // Re-read the clock every 30 seconds so scheduled engines flip on screen.
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const now = Date.now();
  const stats = useMemo(() => {
    if (!engines) return null;
    const feature = ENGINE_DEFS.filter((d) => !d.effect);
    const st = (d: EngineDef) => engineStatus(engines[d.key], now);
    return {
      running: feature.filter((d) => st(d) === "running").length,
      total: feature.length,
      paused: feature.filter((d) => st(d) !== "running").map((d) => d.name),
      scheduled: ENGINE_DEFS.filter((d) => engines[d.key].on && (engines[d.key].from || engines[d.key].until || engines[d.key].hours)).length,
      maintenance: st(ENGINE_DEFS.find((d) => d.key === "maintenance")!) === "running",
    };
  }, [engines, now]);

  if (err) return <p className="text-[#b3261e]">{err}</p>;
  if (!engines || !stats) return <PageHead title="Engines" sub="Loading…" />;

  const term = q.trim().toLowerCase();
  const shown = ENGINE_DEFS.filter((d) => !term || `${d.name} ${d.summary} ${d.group}`.toLowerCase().includes(term));

  return (
    <>
      <PageHead
        title="Engines"
        sub="Every part of the marketplace, with its switch, schedule and rules. Changes reach everyone within about 20 seconds, and every change is in the audit log."
      />
      {stats.maintenance && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[22px] bg-[#ffe5e5] px-5 py-4 text-[14px] text-[#7a1712]">
          <Construction className="h-5 w-5 shrink-0" />
          <span className="flex-1"><b>Maintenance mode is on.</b> Shoppers and businesses see the maintenance screen, and every change they try is refused.</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Features running" value={`${stats.running}/${stats.total}`} hint={stats.paused.length ? `${stats.paused.length} paused` : "Everything is on"} icon={Activity} />
        <Stat label="On a schedule" value={stats.scheduled} hint="window or daily hours" icon={CalendarClock} />
        <Stat label="Site" value={stats.maintenance ? "Offline" : "Online"} hint={stats.maintenance ? "maintenance mode" : "open to everyone"} icon={Power} />
        <Stat label="Paused now" value={stats.paused.length} hint={stats.paused.slice(0, 2).join(", ") || "none"} icon={CalendarDays} />
      </div>

      <div className="relative mt-6 max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an engine" className="pl-10" aria-label="Find an engine" />
      </div>

      {GROUPS.map((g) => {
        const defs = shown.filter((d) => d.group === g);
        if (!defs.length) return null;
        return (
          <div key={g} className="mt-6">
            <Panel title={g} pad={false}>
              <ul className="divide-y divide-hair">
                {defs.map((d) => (
                  <EngineRow key={d.key} def={d} state={engines[d.key]} now={now} onSaved={setEngines} />
                ))}
              </ul>
            </Panel>
          </div>
        );
      })}
      {!shown.length && <p className="mt-8 text-center text-[14px] text-mute">No engine matches “{q}”.</p>}
    </>
  );
}

/* ───────────────────────────── One engine ───────────────────────────── */

/** ISO → value for <input type="datetime-local"> in the admin's own time zone. */
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

function EngineRow({ def, state, now, onSaved }: { def: EngineDef; state: EngineState; now: number; onSaved: (e: Engines) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EngineState>(state);
  const [busy, setBusy] = useState<"" | "switch" | "save" | "reset">("");
  useEffect(() => setDraft(state), [state]);
  const Icon = ICONS[def.key];
  const st = engineStatus(state, now);
  const b = badge(def, st, state);
  const dirty = JSON.stringify(draft) !== JSON.stringify(state);

  const send = async (next: Partial<EngineState> | null, kind: typeof busy, msg: string, reason?: string) => {
    setBusy(kind);
    try {
      const r = await adminApi<{ engines: Engines }>("engines.set", { key: def.key, state: next, reason });
      onSaved(r.engines);
      mutateToast(msg);
      return true;
    } catch (e) {
      mutateToast((e as Error).message, true);
      return false;
    } finally {
      setBusy("");
    }
  };

  const flip = async (on: boolean) => {
    // Taking the site offline, or pausing a feature people are using, asks first.
    if (def.key === "maintenance" && on) {
      const r = await confirm({
        title: "Take the marketplace offline?",
        body: "Everyone except admins sees the maintenance screen and every change is refused until you switch this off (or its window ends).",
        action: "Go offline",
        danger: true,
        reason: true,
      });
      if (!r.ok) return;
      return send({ on }, "switch", "The marketplace is offline", r.reason);
    }
    if (!def.effect && !on) {
      const r = await confirm({ title: `Pause ${def.name.toLowerCase()}?`, body: def.offEffect, action: "Pause", danger: true, reason: true });
      if (!r.ok) return;
      return send({ on }, "switch", `${def.name} paused`, r.reason);
    }
    if (def.key === "announcement" && on && !String(state.params.text ?? "").trim()) {
      setOpen(true);
      return mutateToast("Write the announcement first, then switch it on.", true);
    }
    return send({ on }, "switch", def.effect ? `${def.name} on` : `${def.name} running`);
  };

  const save = () => send({ from: draft.from, until: draft.until, hours: draft.hours, message: draft.message, params: draft.params }, "save", `${def.name} saved`);
  const reset = async () => {
    const r = await confirm({ title: `Reset ${def.name.toLowerCase()}?`, body: "Its switch, schedule, message and rules go back to their defaults.", action: "Reset", danger: true });
    if (r.ok) await send(null, "reset", `${def.name} reset`);
  };

  return (
    <li className={cn(isAttention(def, st) && "bg-[#fffaf0]")}>
      <div className="flex items-start gap-4 px-5 py-4 sm:px-6">
        <span className={cn("mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl", st === "running" ? (def.key === "maintenance" ? "bg-[#b3261e] text-white" : "bg-ink text-white") : "bg-mist text-mute")}>
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight">{def.name}</span>
            <Status tone={b.tone}>{b.label}</Status>
          </div>
          <p className="mt-0.5 max-w-2xl text-[13px] text-mute">{def.summary}</p>
          <button onClick={() => setOpen(!open)} className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium text-link" aria-expanded={open}>
            {open ? "Hide settings" : "Schedule and rules"}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </button>
        </div>
        <div className={cn("shrink-0 pt-1 transition-opacity", busy === "switch" && "pointer-events-none opacity-50")}>
          <Toggle checked={state.on} onChange={flip} label={<span className="sr-only">{def.name}</span>} />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="space-y-6 border-t border-hair bg-paper/60 px-5 py-5 sm:px-6 sm:pl-[80px]">
              {def.params.length > 0 && (
                <Section title="Rules">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {def.params.map((p) => (
                      <ParamField key={p.key} def={p} value={draft.params[p.key]} onChange={(v) => setDraft({ ...draft, params: { ...draft.params, [p.key]: v } })} />
                    ))}
                  </div>
                </Section>
              )}

              <Section title="Schedule" hint={def.effect ? "Runs only inside this window and these hours." : "Outside this window or these hours it behaves as paused."}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Starts" hint="Your local time. Empty: straight away.">
                    <Input type="datetime-local" value={toLocal(draft.from)} onChange={(e) => setDraft({ ...draft, from: fromLocal(e.target.value) })} />
                  </Field>
                  <Field label="Ends" hint="Empty: no end.">
                    <Input type="datetime-local" value={toLocal(draft.until)} min={toLocal(draft.from)} onChange={(e) => setDraft({ ...draft, until: fromLocal(e.target.value) })} />
                  </Field>
                </div>
                <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-hair">
                  <Toggle
                    checked={!!draft.hours}
                    onChange={(v) => setDraft({ ...draft, hours: v ? { start: "08:00", end: "20:00" } : null })}
                    label={<span className="text-[14px] font-medium">Only during daily hours (Lagos time)</span>}
                  />
                  {draft.hours && (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-sm">
                      <Field label="From">
                        <Input type="time" value={draft.hours.start} onChange={(e) => setDraft({ ...draft, hours: { ...draft.hours!, start: e.target.value } })} />
                      </Field>
                      <Field label="To">
                        <Input type="time" value={draft.hours.end} onChange={(e) => setDraft({ ...draft, hours: { ...draft.hours!, end: e.target.value } })} />
                      </Field>
                    </div>
                  )}
                </div>
              </Section>

              {def.key !== "announcement" && (
                <Section title={def.key === "maintenance" ? "Maintenance message" : "Message while paused"}>
                  <Input value={draft.message} maxLength={240} onChange={(e) => setDraft({ ...draft, message: e.target.value })} placeholder={def.pausedText} />
                </Section>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={save} loading={busy === "save"} disabled={!dirty}>Save {def.name.toLowerCase()}</Button>
                {dirty && <Button variant="secondary" onClick={() => setDraft(state)}>Discard</Button>}
                <button onClick={reset} disabled={!!busy} className="ml-auto inline-flex items-center gap-1.5 text-[13px] text-mute hover:text-ink">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-3">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-faint">{title}</div>
        {hint && <p className="text-[12px] text-faint">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

const UNIT: Record<string, string> = { percent: "%", days: "days", hours: "hours", count: "", chars: "characters", perMin: "per minute", naira: "" };

function ParamField({ def, value, onChange }: { def: ParamDef; value: unknown; onChange: (v: number | boolean | string) => void }) {
  if (def.type === "bool")
    return (
      <div className="rounded-2xl bg-white p-4 ring-1 ring-hair sm:col-span-2">
        <Toggle checked={!!value} onChange={onChange} label={<span className="text-[14px] font-medium">{def.label}</span>} />
        {def.hint && <p className="mt-1 max-w-md text-[12px] text-mute">{def.hint}</p>}
      </div>
    );
  if (def.type === "select")
    return (
      <Field label={def.label} hint={def.hint}>
        <Select value={String(value)} onChange={(e) => onChange(e.target.value)}>
          {def.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </Field>
    );
  if (def.type === "text")
    return (
      <Field label={def.label} hint={def.hint} className="sm:col-span-2">
        <Input value={String(value ?? "")} maxLength={def.max} onChange={(e) => onChange(e.target.value)} />
      </Field>
    );
  const n = Number(value);
  const unit = def.unit === "naira" ? "" : UNIT[def.unit ?? "count"];
  const hint = [def.hint, def.unit === "naira" && Number.isFinite(n) ? naira(n) : "", `${def.min.toLocaleString()}–${def.max.toLocaleString()}${unit ? ` ${unit}` : ""}`].filter(Boolean).join(" · ");
  return (
    <Field label={def.label} hint={hint}>
      <div className="relative">
        {def.unit === "naira" && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-mute">₦</span>}
        <Input
          type="number"
          inputMode="decimal"
          min={def.min}
          max={def.max}
          step={def.step ?? 1}
          value={Number.isFinite(n) ? n : ""}
          onChange={(e) => onChange(e.target.value === "" ? def.min : Number(e.target.value))}
          className={cn(def.unit === "naira" && "pl-8")}
        />
      </div>
    </Field>
  );
}

function mutateToast(msg: string, error = false) {
  toast({ title: error ? "Couldn't save" : msg, body: error ? msg : undefined, tone: error ? "error" : "success" });
}

/* ───────────────────────────── Overview card ───────────────────────────── */

/** Compact engine health for the admin overview. */
export function EngineSummary() {
  const [engines, setEngines] = useState<Engines | null>(null);
  useEffect(() => {
    adminApi<{ engines: Engines }>("engines.get").then((r) => setEngines(r.engines)).catch(() => {});
  }, []);
  if (!engines) return null;
  const now = Date.now();
  const down = ENGINE_DEFS.filter((d) => isAttention(d, engineStatus(engines[d.key], now)));
  return (
    <Panel title="Engines" action={<Link href="/admin/engines" className="text-[13px] font-medium text-link hover:underline">Control room</Link>}>
      {down.length === 0 ? (
        <p className="text-[14px] text-mute">Every feature is running and the site is online.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {down.map((d) => {
            const b = badge(d, engineStatus(engines[d.key], now), engines[d.key]);
            return (
              <Link key={d.key} href="/admin/engines" className="inline-flex items-center gap-2 rounded-full bg-mist py-1 pl-3 pr-1 text-[13px] font-medium hover:bg-hair">
                {d.name} <Status tone={b.tone}>{b.label}</Status>
              </Link>
            );
          })}
        </div>
      )}
    </Panel>
  );
}


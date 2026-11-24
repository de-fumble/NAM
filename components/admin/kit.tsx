"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { create } from "zustand";
import { toast } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button, Select, Sheet, Skeleton } from "../ui";
import { Empty } from "../dashboard/kit";
import { Inbox } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;

export class AdminError extends Error {
  constructor(message: string, public code?: string, public status?: number) {
    super(message);
  }
}

/** Call the admin API. Redirects to sign-in when the admin session has expired. */
export async function adminApi<T = Row>(op: string, body: Row = {}): Promise<T> {
  const res = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op, ...body }) });
  const data = (await res.json().catch(() => ({}))) as Row;
  if (res.status === 401) {
    window.location.reload();
    throw new AdminError("Session expired", "AUTH", 401);
  }
  if (!res.ok) throw new AdminError(data.error ?? "Something went wrong", data.code, res.status);
  return data as T;
}

/** Run a mutation with toasts; returns true on success. */
export async function mutate(op: string, body: Row, success: string) {
  try {
    await adminApi(op, body);
    toast({ title: success, tone: "success" });
    return true;
  } catch (e) {
    toast({ title: "Couldn't save", body: (e as Error).message, tone: "error" });
    return false;
  }
}

/* ───────────────────────────── Data pipeline ───────────────────────────── */

export type DataMode = "stock" | "live";
/** The platform's current data pipeline, shared by the shell badge and the Settings switch. */
export const usePipeline = create<{ mode: DataMode | null; setMode: (m: DataMode) => void }>((set) => ({ mode: null, setMode: (mode) => set({ mode }) }));

/** Small pill showing which data pipeline the platform runs on. */
export function PipelineBadge({ className }: { className?: string }) {
  const mode = usePipeline((s) => s.mode);
  if (!mode) return null;
  const live = mode === "live";
  return (
    <a
      href="/admin/settings#pipeline"
      title="Change the data pipeline"
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold transition",
        live ? "bg-brand/10 text-brand hover:bg-brand/15" : "bg-[#fff4d6] text-[#8a5a00] hover:bg-[#ffecb8]",
        className,
      )}
    >
      <span className={cn("relative h-1.5 w-1.5 rounded-full", live ? "bg-brand" : "bg-[#d08a00]")}>
        {live && <span className="absolute inset-0 animate-ping rounded-full bg-brand opacity-60" />}
      </span>
      {live ? "Live data" : "Stock data"}
    </a>
  );
}

/* ───────────────────────────── Confirm dialog ───────────────────────────── */

interface ConfirmReq {
  title: string;
  body?: string;
  action: string;
  danger?: boolean;
  reason?: boolean;
  resolve: (r: { ok: boolean; reason: string }) => void;
}
const useConfirmStore = create<{ req: ConfirmReq | null; set: (r: ConfirmReq | null) => void }>((set) => ({ req: null, set: (req) => set({ req }) }));

export function confirm(opts: Omit<ConfirmReq, "resolve">) {
  return new Promise<{ ok: boolean; reason: string }>((resolve) => useConfirmStore.getState().set({ ...opts, resolve }));
}

export function ConfirmHost() {
  const req = useConfirmStore((s) => s.req);
  const set = useConfirmStore((s) => s.set);
  const [reason, setReason] = useState("");
  useEffect(() => setReason(""), [req]);
  const close = (ok: boolean) => {
    req?.resolve({ ok, reason });
    set(null);
  };
  return (
    <Sheet open={!!req} onClose={() => close(false)} title={req?.title}>
      {req && (
        <div className="pb-2">
          {req.danger && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl bg-[#fdecea] p-4 text-[14px] text-[#8c1d18]">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> This affects what people see on the marketplace right away.
            </div>
          )}
          {req.body && <p className="text-[15px] text-mute">{req.body}</p>}
          {req.reason && (
            <textarea
              autoFocus
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (saved to the audit log)"
              className="mt-4 w-full resize-none rounded-2xl border border-line p-3.5 text-[15px] outline-none focus:border-link"
            />
          )}
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => close(false)}>Cancel</Button>
            <Button className={cn("flex-1", req.danger && "!bg-[#c4281c] hover:!bg-[#a32117]")} onClick={() => close(true)} disabled={req.reason && !reason.trim()}>
              {req.action}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ───────────────────────────── Entity table ───────────────────────────── */

export interface Col {
  key: string;
  label: string;
  render?: (r: Row) => ReactNode;
  className?: string;
}
export interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export function useList(entity: string, filters: Row, q: string, page: number, limit = 50) {
  const [state, setState] = useState<{ rows: Row[]; total: number; loading: boolean; error?: string }>({ rows: [], total: 0, loading: true });
  const seq = useRef(0);
  const load = useCallback(async () => {
    const n = ++seq.current;
    setState((s) => ({ ...s, loading: true }));
    try {
      const r = await adminApi<{ rows: Row[]; total: number }>("list", { entity, filters, q, page, limit });
      if (n === seq.current) setState({ rows: r.rows, total: r.total, loading: false });
    } catch (e) {
      if (n === seq.current) setState({ rows: [], total: 0, loading: false, error: (e as Error).message });
    }
  }, [entity, JSON.stringify(filters), q, page, limit]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => void load(), [load]);
  return { ...state, reload: load };
}

export function EntityTable({
  entity,
  columns,
  filters = [],
  actions,
  onOpen,
  searchPlaceholder = "Search",
  initialFilters = {},
  refreshKey = 0,
}: {
  entity: string;
  columns: Col[];
  filters?: FilterDef[];
  actions?: (r: Row, reload: () => void) => ReactNode;
  onOpen?: (r: Row, reload: () => void) => void;
  searchPlaceholder?: string;
  initialFilters?: Row;
  refreshKey?: number;
}) {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [f, setF] = useState<Row>(initialFilters);
  const [page, setPage] = useState(0);
  const limit = 50;
  const { rows, total, loading, error, reload } = useList(entity, f, q, page, limit);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(input);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [input]);
  useEffect(() => {
    if (refreshKey) reload();
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="overflow-hidden rounded-[24px] bg-white shadow-card ring-1 ring-black/[0.03]">
      <div className="flex flex-wrap items-center gap-2 border-b border-hair p-4">
        <div className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-full bg-mist px-4">
          <Search className="h-4 w-4 text-faint" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={searchPlaceholder} className="h-full flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint" />
        </div>
        {filters.map((fd) => (
          <div key={fd.key} className="w-auto">
            <Select
              value={f[fd.key] ?? ""}
              onChange={(e) => {
                setF({ ...f, [fd.key]: e.target.value });
                setPage(0);
              }}
              className="h-10 rounded-full pr-9 text-[13px]"
              aria-label={fd.label}
            >
              <option value="">{fd.label}: all</option>
              {fd.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
        ))}
      </div>

      {error ? (
        <div className="p-10 text-center text-[14px] text-[#b3261e]">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-hair">
                {columns.map((c) => <th key={c.key} className={cn("px-4 py-3 text-left text-[12px] font-medium text-faint first:pl-6", c.className)}>{c.label}</th>)}
                {actions && <th className="px-4 py-3 pr-6 text-right text-[12px] font-medium text-faint">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-hair">
              {loading && rows.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {columns.map((c) => <td key={c.key} className="px-4 py-4 first:pl-6"><Skeleton className="h-4 w-full max-w-[140px]" /></td>)}
                      {actions && <td className="px-4 py-4 pr-6"><Skeleton className="ml-auto h-8 w-24 rounded-full" /></td>}
                    </tr>
                  ))
                : rows.map((r, i) => (
                    <tr
                      key={r.id ?? r.phone ?? i}
                      onClick={onOpen ? () => onOpen(r, reload) : undefined}
                      className={cn("transition-colors", onOpen && "cursor-pointer hover:bg-mist/50", loading && "opacity-60")}
                    >
                      {columns.map((c) => <td key={c.key} className={cn("px-4 py-3.5 text-[14px] first:pl-6", c.className)}>{c.render ? c.render(r) : String(r[c.key] ?? "—")}</td>)}
                      {actions && (
                        <td className="px-4 py-3 pr-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">{actions(r, reload)}</div>
                        </td>
                      )}
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && <Empty icon={Inbox} title="Nothing here" body={q ? `No results for “${q}”.` : "No records match these filters."} />}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-hair px-6 py-3 text-[13px] text-mute">
        <span className="tabular-nums">{total === 0 ? "0 results" : `${page * limit + 1}–${Math.min(total, (page + 1) * limit)} of ${total.toLocaleString()}`}</span>
        <div className="flex gap-1">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-mist disabled:opacity-30" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
          <button disabled={(page + 1) * limit >= total} onClick={() => setPage(page + 1)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-mist disabled:opacity-30" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

/** Small pill button used in table rows. */
export function RowBtn({ children, onClick, tone = "default", disabled }: { children: ReactNode; onClick: () => void; tone?: "default" | "danger" | "brand"; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] font-medium transition disabled:opacity-40",
        tone === "danger" ? "bg-[#fdecea] text-[#b3261e] hover:bg-[#fad9d5]" : tone === "brand" ? "bg-brand text-white hover:bg-brand-ink" : "bg-mist text-ink hover:bg-hair",
      )}
    >
      {children}
    </button>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[12px] text-mute">{children}</span>;
}

export function JsonView({ value }: { value: unknown }) {
  return <pre className="max-h-[50vh] overflow-auto rounded-2xl bg-mist p-4 text-[12px] leading-relaxed">{JSON.stringify(value, null, 2)}</pre>;
}

export function Fade({ k, children }: { k: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={k} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

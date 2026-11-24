"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, CircleAlert, CircleCheck, CircleDashed, CircleDot, Clock, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { easeApple } from "../ui";

/* --------------------------------- Layout --------------------------------- */

export function PageHead({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="headline text-[32px] sm:text-[40px]">{title}</h1>
        {sub && <p className="mt-1.5 text-[15px] text-mute sm:text-[17px]">{sub}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, pad = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeApple }}
      className={cn("rounded-[24px] bg-white shadow-card ring-1 ring-black/[0.03]", className)}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-6 pb-2 pt-5">
          <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
          {action}
        </div>
      )}
      <div className={cn(pad && "px-6 pb-6", !title && !action && pad && "pt-6")}>{children}</div>
    </motion.section>
  );
}

export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-[13px] font-medium text-link hover:underline">
      {children}
    </Link>
  );
}

export function Stat({ label, value, delta, hint, icon: Icon }: { label: string; value: ReactNode; delta?: number; hint?: string; icon?: LucideIcon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeApple }}
      className="rounded-[22px] bg-white p-5 shadow-card ring-1 ring-black/[0.03]"
    >
      <div className="flex items-center justify-between text-[13px] text-mute">
        {label}
        {Icon && <Icon className="h-4 w-4 text-faint" strokeWidth={1.8} />}
      </div>
      <div className="mt-2 text-[28px] font-semibold tracking-[-0.03em] tabular-nums">{value}</div>
      {(delta !== undefined || hint) && (
        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-mute">
          {delta !== undefined && (
            <span className={cn("inline-flex items-center gap-0.5 font-semibold", delta >= 0 ? "text-brand" : "text-[#c4321d]")}>
              {delta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(delta)}%
            </span>
          )}
          {hint}
        </div>
      )}
    </motion.div>
  );
}

export function Empty({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <Icon className="h-10 w-10 text-faint" strokeWidth={1.3} />
      <div className="mt-3 text-[17px] font-semibold tracking-tight">{title}</div>
      {body && <p className="mt-1 max-w-sm text-[14px] text-mute">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* --------------------------------- Status --------------------------------- */

export type Tone = "good" | "warning" | "serious" | "critical" | "info" | "neutral";
const TONES: Record<Tone, { cls: string; icon: LucideIcon }> = {
  good: { cls: "bg-[#e7f5ee] text-[#006c48]", icon: CircleCheck },
  warning: { cls: "bg-[#fff4d6] text-[#8a5a00]", icon: Clock },
  serious: { cls: "bg-[#ffe9dc] text-[#a8430f]", icon: CircleAlert },
  critical: { cls: "bg-[#ffe5e5] text-[#b3261e]", icon: CircleAlert },
  info: { cls: "bg-[#e8f1ff] text-[#0b57c2]", icon: CircleDot },
  neutral: { cls: "bg-mist text-ink-2", icon: CircleDashed },
};

/** Status always ships with an icon and a label — never colour alone. */
export function Status({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  const t = TONES[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold", t.cls, className)}>
      <t.icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      {children}
    </span>
  );
}

/* ---------------------------------- Utils ---------------------------------- */

export function timeAgo(ts: number) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });

/** Deterministic pseudo-random daily series, so charts are stable between renders. */
export function series(seed: string, days: number, base: number, spread: number, trend = 0.012) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 2 ** 32;
  };
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1 - i));
    const weekend = d.getDay() === 0 ? 0.55 : d.getDay() === 6 ? 1.2 : 1;
    const v = Math.max(0, Math.round(base * (1 + trend * i) * weekend + (rnd() - 0.5) * spread));
    return { label: d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }), value: v };
  });
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const nice = (max: number) => {
  if (max <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};

/* ------------------------------- Area chart ------------------------------- */

const BRAND = "#00875a";

/** Single-series area chart with crosshair + tooltip. The title names the series, so no legend. */
export function AreaChart({ data, format, height = 220 }: { data: { label: string; value: number }[]; format: (n: number) => string; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 44;
  const padB = 24;
  const padT = 8;
  const innerW = Math.max(0, w - padL - 4);
  const innerH = height - padB - padT;
  const max = nice(Math.max(...data.map((d) => d.value)) * 1.1);
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;
  const x = (i: number) => padL + i * step;
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${padT + innerH} L${padL},${padT + innerH} Z`;
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const xl = [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {w > 0 && (
        <svg
          width={w}
          height={height}
          className="overflow-visible"
          onPointerMove={(e) => {
            const r = (e.currentTarget as SVGElement).getBoundingClientRect();
            const i = Math.round((e.clientX - r.left - padL) / step);
            setHover(i >= 0 && i < data.length ? i : null);
          }}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`Trend over ${data.length} days`}
        >
          <defs>
            <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={BRAND} stopOpacity="0.18" />
              <stop offset="100%" stopColor={BRAND} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={w - 4} y1={y(t)} y2={y(t)} stroke="#e8e8ed" strokeDasharray={t === 0 ? undefined : "2 4"} />
              <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="fill-faint text-[11px] tabular-nums">
                {format(t)}
              </text>
            </g>
          ))}
          {xl.map((i) => (
            <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} className="fill-faint text-[11px]">
              {data[i]?.label}
            </text>
          ))}
          <motion.path d={area} fill="url(#area-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
          <motion.path
            d={line}
            fill="none"
            stroke={BRAND}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: easeApple }}
          />
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + innerH} stroke="#86868b" strokeWidth={1} />
              <circle cx={x(hover)} cy={y(data[hover].value)} r={5} fill={BRAND} stroke="#fff" strokeWidth={2} />
            </g>
          )}
          <rect x={padL} y={0} width={innerW} height={height} fill="transparent" />
        </svg>
      )}
      {hover !== null && w > 0 && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-xl bg-white px-3 py-2 shadow-float ring-1 ring-black/5"
          style={{ left: Math.min(Math.max(x(hover) - 60, 0), w - 130), transform: "translateY(-8px)" }}
        >
          <div className="text-[15px] font-semibold tabular-nums">{format(data[hover].value)}</div>
          <div className="text-[11px] text-mute">{data[hover].label}</div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Bar chart -------------------------------- */

export function BarChart({ data, format, height = 180 }: { data: { label: string; value: number }[]; format: (n: number) => string; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padB = 22;
  const innerH = height - padB - 6;
  const max = nice(Math.max(...data.map((d) => d.value), 1) * 1.05);
  const gap = 2;
  const bw = w > 0 ? Math.max(4, (w - gap * (data.length - 1)) / data.length) : 0;
  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} onPointerLeave={() => setHover(null)} role="img" aria-label="Bar chart">
          <line x1={0} x2={w} y1={6 + innerH} y2={6 + innerH} stroke="#e8e8ed" />
          {data.map((d, i) => {
            const h = Math.max(2, (d.value / max) * innerH);
            const bx = i * (bw + gap);
            const by = 6 + innerH - h;
            const r = Math.min(4, bw / 2);
            return (
              <g key={d.label + i} onPointerEnter={() => setHover(i)}>
                <rect x={bx - gap / 2} y={0} width={bw + gap} height={height} fill="transparent" />
                <motion.path
                  d={`M${bx},${6 + innerH} V${by + r} Q${bx},${by} ${bx + r},${by} H${bx + bw - r} Q${bx + bw},${by} ${bx + bw},${by + r} V${6 + innerH} Z`}
                  fill={BRAND}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  style={{ originY: 1, transformBox: "fill-box" }}
                  transition={{ duration: 0.7, ease: easeApple, delay: i * 0.02 }}
                />
                {(data.length <= 8 || i % Math.ceil(data.length / 7) === 0) && (
                  <text x={bx + bw / 2} y={height - 4} textAnchor="middle" className="fill-faint text-[11px]">
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && w > 0 && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl bg-white px-3 py-2 shadow-float ring-1 ring-black/5"
          style={{ left: Math.min(Math.max(hover * (bw + gap) + bw / 2 - 55, 0), w - 120), top: -8 }}
        >
          <div className="text-[15px] font-semibold tabular-nums">{format(data[hover].value)}</div>
          <div className="text-[11px] text-mute">{data[hover].label}</div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Meter ---------------------------------- */

export function Meter({ value, label, sub }: { value: number; label: string; sub?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[14px] text-ink-2">{label}</span>
        <span className="text-[15px] font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-hair">
        <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: easeApple }} />
      </div>
      {sub && <div className="mt-1.5 text-[12px] text-faint">{sub}</div>}
    </div>
  );
}

/* --------------------------------- Tables --------------------------------- */

export const th = "px-4 py-3 text-left text-[12px] font-medium text-faint first:pl-6 last:pr-6";
export const td = "px-4 py-3.5 text-[14px] first:pl-6 last:pr-6";

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="no-scrollbar -mx-1 mb-5 flex gap-1 overflow-x-auto px-1">
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            className={cn("relative h-9 shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors", on ? "text-white" : "text-ink-2 hover:bg-mist")}
          >
            {on && <motion.span layoutId="dash-tabs" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
            <span className="relative">
              {it.label}
              {it.count !== undefined && <span className={cn("ml-1.5 tabular-nums", on ? "text-white/60" : "text-faint")}>{it.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

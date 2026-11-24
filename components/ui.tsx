"use client";

import Link from "next/link";
import { AnimatePresence, motion, type HTMLMotionProps } from "framer-motion";
import { Car, ChevronDown, Star, X } from "lucide-react";
import { forwardRef, useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn, initials } from "@/lib/utils";

export const spring = { type: "spring", stiffness: 380, damping: 32, mass: 0.8 } as const;
export const easeApple = [0.28, 0.11, 0.32, 1] as const;

/* ---------------------------------- Button --------------------------------- */

type Variant = "primary" | "secondary" | "ghost" | "brand" | "light" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-black",
  brand: "bg-brand text-white hover:bg-brand-ink",
  secondary: "bg-mist text-ink hover:bg-hair",
  ghost: "text-ink hover:bg-mist",
  light: "bg-white text-ink hover:bg-white/90",
  outline: "border border-line text-ink hover:border-ink bg-white",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-[17px]",
};

interface BtnProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  href?: string;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = "primary", size = "md", className, href, loading, children, disabled, ...rest },
  ref,
) {
  const cls = cn(
    "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium",
    "transition-[background-color,color,transform,box-shadow,border-color] duration-300 ease-apple active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-40",
    variants[variant],
    sizes[size],
    className,
  );
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button ref={ref} className={cls} disabled={disabled || loading} {...rest}>
      <span className={cn("inline-flex items-center gap-2 transition-opacity", loading && "opacity-0")}>{children}</span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner className={variant === "primary" || variant === "brand" ? "text-white" : "text-ink"} />
        </span>
      )}
    </button>
  );
});

export function Spinner({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cn("animate-spin", className)} aria-label="Loading" data-icon>
      {Array.from({ length: 8 }).map((_, i) => (
        <rect
          key={i}
          x="11"
          y="2"
          width="2"
          height="6"
          rx="1"
          fill="currentColor"
          opacity={0.15 + (i / 8) * 0.85}
          transform={`rotate(${i * 45} 12 12)`}
        />
      ))}
    </svg>
  );
}

/* ---------------------------------- Image ---------------------------------- */

export function Img({
  src,
  alt,
  className,
  imgClassName,
  priority,
  sizes,
  srcSet,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  sizes?: string;
  srcSet?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setError(false);
    const el = ref.current;
    if (el?.complete && el.naturalWidth > 0) setLoaded(true);
    else setLoaded(false);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden bg-mist", className)}>
      <div
        aria-hidden
        className={cn("shimmer absolute inset-0 transition-opacity duration-500", loaded || error ? "opacity-0" : "opacity-100")}
      />
      {error ? (
        <div className="absolute inset-0 grid place-items-center text-faint">
          <Car className="h-10 w-10" strokeWidth={1.2} />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={ref}
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            "h-full w-full object-cover transition-[opacity,transform,filter] duration-700 ease-apple",
            loaded ? "scale-100 opacity-100 blur-0" : "scale-[1.03] opacity-0 blur-sm",
            imgClassName,
          )}
        />
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-xl", className)} />;
}

/* ---------------------------------- Reveal --------------------------------- */

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  ...rest
}: { children: ReactNode; delay?: number; y?: number; className?: string } & Omit<HTMLMotionProps<"div">, "children">) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, ease: easeApple, delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* --------------------------------- Badges ---------------------------------- */

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "dark" | "gold" | "glass";
  className?: string;
}) {
  const tones = {
    neutral: "bg-mist text-ink-2",
    brand: "bg-brand-soft text-brand-ink",
    dark: "bg-ink text-white",
    gold: "bg-[#fbf3e0] text-gold",
    glass: "glass text-ink",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[-0.005em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Stars({ value, className, size = 12 }: { value: number; className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i < Math.round(value) ? "fill-current" : "fill-none opacity-30"}
        />
      ))}
    </span>
  );
}

export function Avatar({ name, hue = 150, size = 44, className }: { name: string; hue?: number; size?: number; className?: string }) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full font-semibold text-white", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${hue} 55% 52%), hsl(${(hue + 40) % 360} 60% 38%))`,
      }}
    >
      {initials(name)}
    </span>
  );
}

/* ------------------------------ Segmented control ------------------------------ */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  dark,
  size = "md",
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  dark?: boolean;
  size?: "sm" | "md";
}) {
  const id = useId();
  return (
    <div
      role="tablist"
      className={cn(
        "relative inline-flex rounded-full p-1",
        dark ? "bg-white/10 backdrop-blur-xl" : "bg-[#e8e8ed]/70",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-10 flex-1 whitespace-nowrap rounded-full font-medium transition-colors duration-300",
              size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2 text-[14px]",
              dark ? (active ? "text-ink" : "text-white/70 hover:text-white") : active ? "text-ink" : "text-mute hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring}
                className="absolute inset-0 -z-10 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.1),0_3px_8px_rgb(0_0_0/0.06)]"
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Chips ---------------------------------- */

export function Chip({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[14px] font-medium transition-all duration-300 ease-apple active:scale-[0.97]",
        active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink/50",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* --------------------------------- Inputs ---------------------------------- */

export function Field({ label, hint, children, className }: { label?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>}
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-faint">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "h-12 w-full rounded-xl border border-line bg-white px-4 text-[15px] text-ink placeholder:text-faint outline-none transition-[border-color,box-shadow] duration-200 focus:border-link focus:shadow-[0_0_0_4px_rgb(0_102_204/0.12)]";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(inputCls, className)} {...p} />;
});

export function Select({ className, children, ...p }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(inputCls, "appearance-none pr-10", className)} {...p}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-1.5 text-left text-[15px]"
    >
      {label && <span>{label}</span>}
      <span
        className={cn(
          "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300",
          checked ? "bg-[#34c759]" : "bg-[#e9e9ea]",
        )}
      >
        <motion.span
          layout
          transition={spring}
          className={cn(
            "absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.06)]",
            checked ? "right-[2px]" : "left-[2px]",
          )}
        />
      </span>
    </button>
  );
}

export function Range({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ ["--fill" as string]: `${fill}%` }}
      className="w-full"
    />
  );
}

/* ---------------------------------- Sheet ---------------------------------- */

export function Sheet({
  open,
  onClose,
  children,
  title,
  className,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: easeApple }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            className={cn(
              "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-float sm:rounded-[28px]",
              wide ? "sm:max-w-3xl" : "sm:max-w-lg",
              className,
            )}
          >
            <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-hair sm:hidden" />
            <div className="flex items-center justify-between px-6 pb-2 pt-4 sm:pt-6">
              <div className="text-[19px] font-semibold tracking-tight">{title}</div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full bg-mist text-mute transition hover:bg-hair hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* --------------------------------- Sections -------------------------------- */

export function SectionHead({
  eyebrow,
  title,
  sub,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Reveal className={cn("mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h2 className="headline text-balance text-[32px] sm:text-[44px]">{title}</h2>
        {sub && <p className="mt-3 text-balance text-[17px] leading-relaxed text-mute sm:text-[19px]">{sub}</p>}
      </div>
      {action}
    </Reveal>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-5 sm:px-8", className)}>{children}</div>;
}

/** Brand logo. Uses the light artwork on dark surfaces. `size` is the rendered height in px. */
export function Logo({ dark, className, size = 48, href = "/" }: { dark?: boolean; className?: string; size?: number; href?: string | null }) {
  const art = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dark ? "/logo-light.png" : "/logo.png"}
      alt="Naija Auto Market"
      width={Math.round(size * (480 / 349))}
      height={size}
      style={{ height: size, width: "auto" }}
      className="select-none transition-transform duration-500 ease-spring group-hover:scale-[1.04]"
      draggable={false}
    />
  );
  if (!href) return <span className={cn("inline-flex", className)}>{art}</span>;
  return (
    <Link href={href} className={cn("group inline-flex shrink-0 items-center", className)} aria-label="Naija Auto Market home">
      {art}
    </Link>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden data-icon>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.38 9.38 0 0 1-1.44-5.01c0-5.19 4.23-9.42 9.43-9.42a9.37 9.37 0 0 1 9.42 9.43c0 5.2-4.23 9.42-9.42 9.42m8.02-17.44A11.27 11.27 0 0 0 12.05.75C5.8.75.71 5.84.71 12.1c0 2 .52 3.95 1.52 5.67L.62 23.25l5.6-1.47a11.3 11.3 0 0 0 5.42 1.38h.01c6.25 0 11.34-5.09 11.34-11.35 0-3.03-1.18-5.88-3.32-8.02" />
    </svg>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-hair", className)} />;
}

/** Animated number that eases toward its target. */
export function Ticker({ value, format }: { value: number; format: (n: number) => string }) {
  const [display, setDisplay] = useState(value);
  const cur = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = cur.current;
    const dur = 600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      cur.current = a + (value - a) * e;
      setDisplay(cur.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="tabular-nums">{format(display)}</span>;
}

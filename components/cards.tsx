"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BadgeCheck, CircleDot, Cog, Disc3, Droplet, Funnel, Heart, Lightbulb, MapPin, Plus, Sparkles, Waves, Zap, CarFront, Check, Clock,
} from "lucide-react";
import { useApp, toast, withUser } from "@/lib/store";
import { act } from "@/lib/gate";
import type { Car } from "@/lib/data/cars";
import type { Part, PartCategory } from "@/lib/data/parts";
import { deliveryFor } from "@/lib/data/parts";
import type { Pro } from "@/lib/data/pros";
import { cn, img, km, naira, nairaShort } from "@/lib/utils";
import { Avatar, Badge, Img, Skeleton, Stars } from "./ui";

/* ---------------------------------- Save ---------------------------------- */

export function SaveButton({ id, className, label }: { id: string; className?: string; label?: boolean }) {
  const saved = useApp((s) => s.saved.includes(id));
  const toggle = useApp((s) => s.toggleSaved);
  return (
    <button
      aria-label={saved ? "Remove from saved" : "Save"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        withUser(() => {
          const now = toggle(id);
          toast({ title: now ? "Saved" : "Removed from saved", body: now ? "Find it any time under Saved." : undefined, tone: now ? "success" : "default" });
        });
      }}
      className={cn(
        "glass inline-flex h-9 items-center justify-center gap-1.5 rounded-full text-ink transition active:scale-90",
        label ? "px-4 text-[14px] font-medium" : "w-9",
        className,
      )}
    >
      <motion.span key={String(saved)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
        <Heart className={cn("h-[18px] w-[18px]", saved && "fill-[#ff375f] text-[#ff375f]")} />
      </motion.span>
      {label && (saved ? "Saved" : "Save")}
    </button>
  );
}

/* --------------------------------- Car card --------------------------------- */

export function CarCard({ car, priority, compact }: { car: Car; priority?: boolean; compact?: boolean }) {
  return (
    <Link href={`/cars/${car.id}`} className="group block">
      <div className="relative">
        <Img
          src={img(car.img, 800, { h: 600 })}
          alt={`${car.year} ${car.make} ${car.model}`}
          priority={priority}
          className="aspect-[4/3] rounded-[22px]"
          imgClassName="group-hover:scale-[1.04] !duration-[900ms]"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone="glass">{car.condition}</Badge>
          {car.inspected && (
            <Badge tone="glass">
              <BadgeCheck className="h-3 w-3 text-brand" /> Inspected
            </Badge>
          )}
        </div>
        <SaveButton id={car.id} className="absolute right-3 top-3" />
      </div>
      <div className={cn("px-1", compact ? "pt-3" : "pt-4")}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-[17px] font-semibold tracking-tight">
            {car.make} {car.model}
          </h3>
          <span className="shrink-0 text-[17px] font-semibold tabular-nums">{nairaShort(car.price)}</span>
        </div>
        <p className="mt-0.5 truncate text-[14px] text-mute">
          {car.year} · {car.trim} · {car.mileage === 0 ? "New" : km(car.mileage)}
        </p>
        {!compact && (
          <p className="mt-1.5 flex items-center gap-1 text-[13px] text-faint">
            <MapPin className="h-3.5 w-3.5" /> {car.city}, {car.state}
            {car.verified && <BadgeCheck className="ml-1 h-3.5 w-3.5 text-link" />}
          </p>
        )}
      </div>
    </Link>
  );
}

export function CarRow({ car }: { car: Car }) {
  return (
    <Link href={`/cars/${car.id}`} className="group flex gap-4 rounded-[22px] bg-white p-3 shadow-card transition hover:shadow-float sm:gap-6">
      <Img src={img(car.img, 600, { h: 450 })} alt={car.model} className="aspect-[4/3] w-36 shrink-0 rounded-2xl sm:w-64" imgClassName="group-hover:scale-[1.04]" />
      <div className="flex min-w-0 flex-1 flex-col py-1 pr-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge>{car.condition}</Badge>
          {car.dutyPaid && <Badge tone="brand">Duty paid</Badge>}
        </div>
        <h3 className="mt-2 truncate text-[17px] font-semibold tracking-tight sm:text-[21px]">
          {car.year} {car.make} {car.model} <span className="font-normal text-mute">{car.trim}</span>
        </h3>
        <p className="mt-1 text-[13px] text-mute sm:text-[14px]">
          {km(car.mileage)} · {car.transmission} · {car.fuel} · {car.engine}
        </p>
        <div className="mt-auto flex items-end justify-between pt-3">
          <span className="text-[19px] font-semibold tabular-nums sm:text-[24px]">{naira(car.price)}</span>
          <span className="hidden items-center gap-1 text-[13px] text-faint sm:flex">
            <MapPin className="h-3.5 w-3.5" /> {car.city}, {car.state}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CarCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[4/3] rounded-[22px]" />
      <div className="space-y-2 px-1 pt-4">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3.5 w-1/3" />
      </div>
    </div>
  );
}

/* ------------------------------- Part visual ------------------------------- */

const partIcon: Record<PartCategory, typeof Cog> = {
  Engine: Cog, Brakes: Disc3, Suspension: Waves, Electrical: Zap, Tyres: CircleDot, Lubricants: Droplet,
  Filters: Funnel, Lighting: Lightbulb, Accessories: Sparkles, Body: CarFront,
};
const partHue: Record<PartCategory, number> = {
  Engine: 210, Brakes: 4, Suspension: 260, Electrical: 45, Tyres: 220, Lubricants: 30, Filters: 170, Lighting: 50, Accessories: 300, Body: 150,
};

export function PartVisual({ category, className, big, small }: { category: PartCategory; className?: string; big?: boolean; small?: boolean }) {
  const Icon = partIcon[category];
  const h = partHue[category];
  return (
    <div
      className={cn("relative grid place-items-center overflow-hidden", className)}
      style={{ background: `radial-gradient(120% 90% at 50% 10%, hsl(${h} 40% 98%), hsl(${h} 22% 92%))` }}
    >
      <div
        className="absolute h-[62%] w-[62%] rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, hsl(${h} 70% 70% / 0.35), transparent 70%)` }}
      />
      <Icon
        strokeWidth={1.1}
        className={cn("relative drop-shadow-[0_12px_18px_rgb(0_0_0/0.12)] transition-transform duration-700 ease-spring group-hover:scale-110 group-hover:-rotate-6", big ? "h-40 w-40" : small ? "h-6 w-6" : "h-20 w-20")}
        style={{ color: `hsl(${h} 35% 30%)` }}
      />
    </div>
  );
}

/* -------------------------------- Part card -------------------------------- */

export function PartCard({ part, onOpen }: { part: Part; onOpen?: () => void }) {
  const add = useApp((s) => s.addToCart);
  const inCart = useApp((s) => s.cart.some((l) => l.id === part.id));
  const d = deliveryFor(part);
  return (
    <div className="group flex flex-col">
      <button onClick={onOpen} className="relative block w-full text-left">
        <PartVisual category={part.category} className="aspect-square rounded-[22px]" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {part.oldPrice && <Badge tone="dark">-{Math.round((1 - part.price / part.oldPrice) * 100)}%</Badge>}
          {part.genuine && <Badge tone="glass"><BadgeCheck className="h-3 w-3 text-brand" /> Genuine</Badge>}
        </div>
      </button>
      <div className="flex flex-1 flex-col px-1 pt-3">
        <div className="text-[12px] font-medium text-faint">{part.brand}</div>
        <button onClick={onOpen} className="mt-0.5 line-clamp-2 text-left text-[15px] font-semibold leading-snug tracking-tight hover:underline">
          {part.name}
        </button>
        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-mute">
          <Stars value={part.rating} /> {part.rating} ({part.reviews.toLocaleString()})
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[17px] font-semibold tabular-nums">{naira(part.price)}</span>
          {part.oldPrice && <span className="text-[13px] text-faint line-through">{naira(part.oldPrice)}</span>}
        </div>
        <div className="mt-1 text-[12px] text-mute">
          <span className="font-semibold text-brand">{d.label}</span> {d.note.split("·")[0]}
        </div>
        <button
          onClick={() =>
            act("parts", () => {
              add(part.id);
              toast({ title: "Added to bag", body: part.name, tone: "success" });
            })
          }
          className={cn(
            "mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium transition-all duration-300 active:scale-95",
            inCart ? "bg-brand-soft text-brand-ink" : "bg-ink text-white hover:bg-black",
          )}
        >
          {inCart ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {inCart ? "In bag · add another" : "Add to bag"}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- Pro card -------------------------------- */

export function ProCard({ pro }: { pro: Pro }) {
  return (
    <Link
      href={`/services/${pro.id}`}
      className="group flex h-full flex-col rounded-[24px] bg-white p-5 shadow-card ring-1 ring-black/[0.03] transition-all duration-500 ease-apple hover:-translate-y-1 hover:shadow-float"
    >
      <div className="flex items-start gap-3.5">
        <Avatar name={pro.name} hue={pro.hue} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[16px] font-semibold tracking-tight">{pro.name}</h3>
            <BadgeCheck className="h-4 w-4 shrink-0 text-link" />
          </div>
          <p className="truncate text-[13px] text-mute">{pro.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[12px] text-faint">
            <MapPin className="h-3 w-3" /> {pro.city}, {pro.state}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {pro.topRated && <Badge tone="gold">★ Top Rated</Badge>}
        {pro.mobile && <Badge tone="brand">Comes to you</Badge>}
        <Badge><Clock className="h-3 w-3" /> ~{pro.responseMins} min reply</Badge>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hair pt-4 text-center">
        <div>
          <div className="text-[15px] font-semibold">{pro.rating.toFixed(2)}</div>
          <div className="text-[11px] text-faint">{pro.reviews} reviews</div>
        </div>
        <div>
          <div className="text-[15px] font-semibold">{pro.jobs.toLocaleString()}</div>
          <div className="text-[11px] text-faint">jobs done</div>
        </div>
        <div>
          <div className="text-[15px] font-semibold">{nairaShort(pro.from)}</div>
          <div className="text-[11px] text-faint">{pro.unit}</div>
        </div>
      </div>
    </Link>
  );
}

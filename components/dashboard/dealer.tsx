"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CarFront, ChevronLeft, ChevronRight, Eye, MessageSquare, Pause, Play, Plus, Tag, TrendingUp, UsersRound, Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useAllCars, useDB, type Lead, type LeadStage, type ListingStatus } from "@/lib/db";
import { useApp, toast } from "@/lib/store";
import { cn, img, naira, nairaShort } from "@/lib/utils";
import { Avatar, Button, Img } from "../ui";
import { AreaChart, Empty, PageHead, Panel, PanelLink, Stat, Status, Tabs, series, td, th, timeAgo, type Tone } from "./kit";

export const STAGES: { id: LeadStage; label: string; tone: Tone }[] = [
  { id: "new", label: "New", tone: "info" },
  { id: "contacted", label: "Contacted", tone: "neutral" },
  { id: "viewing", label: "Viewing booked", tone: "warning" },
  { id: "negotiating", label: "Negotiating", tone: "warning" },
  { id: "won", label: "Sold", tone: "good" },
  { id: "lost", label: "Lost", tone: "critical" },
];
const stageOf = (s: LeadStage) => STAGES.find((x) => x.id === s)!;
const STATUS_TONE: Record<ListingStatus, { tone: Tone; label: string }> = {
  active: { tone: "good", label: "Live" },
  paused: { tone: "neutral", label: "Paused" },
  sold: { tone: "info", label: "Sold" },
  removed: { tone: "critical", label: "Removed by admin" },
};

function useDealer() {
  const user = useApp((s) => s.user)!;
  const all = useAllCars();
  const leads = useDB((s) => s.leads);
  const id = user.businessId!;
  const cars = useMemo(() => all.filter((c) => c.sellerId === id), [all, id]);
  const myLeads = useMemo(() => leads.filter((l) => l.businessId === id).sort((a, b) => b.at - a.at), [leads, id]);
  return { id, cars, leads: myLeads };
}

/* --------------------------------- Overview -------------------------------- */

export function DealerOverview() {
  const { id, cars, leads } = useDealer();
  const views = useMemo(() => series(`${id}-views`, 30, Math.max(40, cars.length * 38), 90), [id, cars.length]);
  const live = cars.filter((c) => c.status === "active");
  const sold = leads.filter((l) => l.stage === "won");
  const newLeads = leads.filter((l) => l.stage === "new");
  const top = [...live].sort((a, b) => b.views - a.views).slice(0, 5);
  const leadCount = (carId: string) => leads.filter((l) => l.carId === carId).length;

  return (
    <>
      <PageHead
        title={`Good ${greeting()}.`}
        sub="Here's how your showroom is performing."
        action={
          <Button href="/sell">
            <Plus className="h-4 w-4" /> List a car
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Live listings" value={live.length} hint={`${cars.length} total`} icon={CarFront} />
        <Stat label="Views · 30 days" value={views.reduce((a, d) => a + d.value, 0).toLocaleString()} delta={18} icon={Eye} />
        <Stat label="New leads" value={newLeads.length} hint={`${leads.length} in pipeline`} icon={UsersRound} />
        <Stat label="Sold" value={nairaShort(sold.reduce((a, l) => a + (l.amount ?? 0), 0))} hint={`${sold.length} ${sold.length === 1 ? "car" : "cars"}`} icon={TrendingUp} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Listing views" action={<span className="text-[12px] text-faint">Last 30 days</span>}>
          <AreaChart data={views} format={(n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)))} />
        </Panel>
        <Panel title="Latest leads" action={<PanelLink href="/dashboard/leads">Pipeline</PanelLink>} pad={false}>
          {leads.length === 0 ? (
            <Empty icon={UsersRound} title="No leads yet" body="Enquiries, offers and inspection bookings appear here." />
          ) : (
            <ul className="divide-y divide-hair">
              {leads.slice(0, 5).map((l) => (
                <LeadRow key={l.id} lead={l} />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Top listings" action={<PanelLink href="/dashboard/inventory">Manage inventory</PanelLink>} className="mt-4" pad={false}>
        {top.length === 0 ? (
          <Empty icon={CarFront} title="No live listings" action={<Button href="/sell">List your first car</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-hair">
                  <th className={th}>Car</th>
                  <th className={th}>Price</th>
                  <th className={cn(th, "text-right")}>Views</th>
                  <th className={cn(th, "text-right")}>Leads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hair">
                {top.map((c) => (
                  <tr key={c.id} className="transition hover:bg-mist/50">
                    <td className={td}>
                      <Link href={`/cars/${c.id}`} className="flex items-center gap-3">
                        <Img src={img(c.img, 160, { h: 120 })} alt="" className="h-10 w-14 shrink-0 rounded-lg" />
                        <span className="font-medium">{c.year} {c.make} {c.model}</span>
                      </Link>
                    </td>
                    <td className={cn(td, "tabular-nums")}>{nairaShort(c.price)}</td>
                    <td className={cn(td, "text-right tabular-nums")}>{c.views.toLocaleString()}</td>
                    <td className={cn(td, "text-right tabular-nums")}>{leadCount(c.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

function LeadRow({ lead }: { lead: Lead }) {
  const all = useAllCars();
  const car = all.find((c) => c.id === lead.carId);
  const st = stageOf(lead.stage);
  return (
    <li className="flex items-center gap-3 px-6 py-3.5">
      <Avatar name={lead.customer.name} hue={lead.customer.name.length * 31} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium">
          {lead.customer.name} <span className="font-normal text-mute">· {kindLabel(lead)}</span>
        </div>
        <div className="truncate text-[12px] text-faint">
          {car ? `${car.year} ${car.make} ${car.model}` : "Listing"} · {timeAgo(lead.at)}
        </div>
      </div>
      <Status tone={st.tone}>{st.label}</Status>
    </li>
  );
}

const kindLabel = (l: Lead) => (l.kind === "offer" ? `offered ${nairaShort(l.amount ?? 0)}` : l.kind === "inspection" ? "booked inspection" : l.kind === "call" ? "called" : "sent a message");

/* -------------------------------- Inventory -------------------------------- */

export function DealerInventory() {
  const { cars, leads } = useDealer();
  const patch = useDB((s) => s.patchCar);
  const [tab, setTab] = useState<ListingStatus | "all">("active");
  const [editing, setEditing] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const list = tab === "all" ? cars : cars.filter((c) => c.status === tab);
  const count = (s: ListingStatus) => cars.filter((c) => c.status === s).length;

  const savePrice = (id: string) => {
    const v = Number(price.replace(/\D/g, ""));
    if (v > 0) {
      patch(id, { price: v });
      toast({ title: "Price updated", body: naira(v), tone: "success" });
    }
    setEditing(null);
  };

  return (
    <>
      <PageHead
        title="Inventory"
        sub="Edit prices, pause listings or mark cars as sold — changes are live on the marketplace instantly."
        action={
          <Button href="/sell">
            <Plus className="h-4 w-4" /> Add car
          </Button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "active", label: "Live", count: count("active") },
          { value: "paused", label: "Paused", count: count("paused") },
          { value: "sold", label: "Sold", count: count("sold") },
          { value: "all", label: "All", count: cars.length },
        ]}
      />
      <Panel pad={false}>
        {list.length === 0 ? (
          <Empty icon={CarFront} title="Nothing here" body="Cars you list will appear in this view." action={<Button href="/sell">List a car</Button>} />
        ) : (
          <ul className="divide-y divide-hair">
            <AnimatePresence initial={false}>
              {list.map((c) => {
                const st = STATUS_TONE[c.status];
                const n = leads.filter((l) => l.carId === c.id).length;
                return (
                  <motion.li key={c.id} layout exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                    <Link href={`/cars/${c.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                      <Img src={img(c.img, 240, { h: 180 })} alt="" className="h-16 w-[88px] shrink-0 rounded-xl" />
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-semibold tracking-tight">
                          {c.year} {c.make} {c.model} <span className="font-normal text-mute">{c.trim}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-mute">
                          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {c.views.toLocaleString()}</span>
                          <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {n} leads</span>
                          <span>{c.condition}</span>
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-3 sm:justify-end">
                      {editing === c.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            savePrice(c.id);
                          }}
                          className="flex items-center gap-1"
                        >
                          <span className="text-mute">₦</span>
                          <input
                            autoFocus
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value.replace(/\D/g, "") || 0).toLocaleString("en-NG"))}
                            onBlur={() => savePrice(c.id)}
                            className="h-9 w-36 rounded-lg border border-link px-2 text-[14px] font-semibold tabular-nums outline-none"
                            aria-label="New price"
                          />
                        </form>
                      ) : (
                        <button
                          onClick={() => {
                            setEditing(c.id);
                            setPrice(c.price.toLocaleString("en-NG"));
                          }}
                          className="group inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[15px] font-semibold tabular-nums hover:bg-mist"
                          title="Edit price"
                        >
                          {naira(c.price)} <Tag className="h-3.5 w-3.5 text-faint opacity-0 transition group-hover:opacity-100" />
                        </button>
                      )}
                      <Status tone={st.tone}>{st.label}</Status>
                      {c.status !== "removed" && (
                      <div className="flex gap-1">
                        {c.status !== "sold" && (
                          <IconBtn
                            label={c.status === "active" ? "Pause listing" : "Make live"}
                            onClick={() => {
                              patch(c.id, { status: c.status === "active" ? "paused" : "active" });
                              toast({ title: c.status === "active" ? "Listing paused" : "Listing is live", tone: "success" });
                            }}
                          >
                            {c.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </IconBtn>
                        )}
                        <IconBtn
                          label={c.status === "sold" ? "Relist" : "Mark as sold"}
                          onClick={() => {
                            patch(c.id, { status: c.status === "sold" ? "active" : "sold" });
                            toast({ title: c.status === "sold" ? "Relisted" : "Marked as sold 🎉", tone: "success" });
                          }}
                        >
                          {c.status === "sold" ? <Play className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </IconBtn>
                      </div>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </Panel>
    </>
  );
}

export function IconBtn({ label, onClick, children, className }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className={cn("grid h-9 w-9 place-items-center rounded-full bg-mist text-ink-2 transition hover:bg-hair hover:text-ink active:scale-95", className)}>
      {children}
    </button>
  );
}

/* ---------------------------------- Leads ---------------------------------- */

export function DealerLeads() {
  const { leads } = useDealer();
  const setStage = useDB((s) => s.setLeadStage);
  const all = useAllCars();
  const pipeline = STAGES.filter((s) => s.id !== "lost");
  const lost = leads.filter((l) => l.stage === "lost");
  const move = (l: Lead, dir: 1 | -1) => {
    const order = pipeline.map((s) => s.id);
    const i = order.indexOf(l.stage);
    const next = order[Math.min(order.length - 1, Math.max(0, i + dir))];
    if (next !== l.stage) setStage(l.id, next);
  };

  return (
    <>
      <PageHead title="Leads" sub="Every enquiry, offer and inspection booking — move buyers through to a sale." />
      <div className="no-scrollbar -mx-5 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
        <div className="grid min-w-[1000px] grid-cols-5 gap-3">
          {pipeline.map((s) => {
            const col = leads.filter((l) => l.stage === s.id);
            return (
              <div key={s.id} className="rounded-[22px] bg-[#f0f0f3] p-2.5">
                <div className="flex items-center justify-between px-2 pb-2.5 pt-1">
                  <Status tone={s.tone}>{s.label}</Status>
                  <span className="text-[12px] font-semibold tabular-nums text-mute">{col.length}</span>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {col.map((l) => {
                      const car = all.find((c) => c.id === l.carId);
                      return (
                        <motion.div
                          key={l.id}
                          layout
                          layoutId={l.id}
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          className="rounded-2xl bg-white p-3 shadow-card"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar name={l.customer.name} hue={l.customer.name.length * 31} size={28} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[13px] font-semibold">{l.customer.name}</div>
                              <div className="text-[11px] text-faint">{timeAgo(l.at)}</div>
                            </div>
                          </div>
                          {car && (
                            <Link href={`/cars/${car.id}`} className="mt-2.5 flex items-center gap-2 rounded-xl bg-mist p-1.5 hover:bg-hair">
                              <Img src={img(car.img, 120, { h: 90 })} alt="" className="h-8 w-11 shrink-0 rounded-lg" />
                              <span className="truncate text-[12px] font-medium">{car.year} {car.model}</span>
                            </Link>
                          )}
                          <div className="mt-2 text-[12px] text-ink-2">
                            {l.kind === "offer" ? (
                              <span className="font-semibold tabular-nums">Offer {naira(l.amount ?? 0)}</span>
                            ) : (
                              <span className="capitalize">{l.kind}</span>
                            )}
                            {l.note && <p className="mt-0.5 line-clamp-2 text-mute">“{l.note}”</p>}
                          </div>
                          <div className="mt-2.5 flex items-center gap-1">
                            <IconBtn label="Move back" onClick={() => move(l, -1)} className="h-7 w-7">
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </IconBtn>
                            <IconBtn label="Move forward" onClick={() => move(l, 1)} className="h-7 w-7">
                              <ChevronRight className="h-3.5 w-3.5" />
                            </IconBtn>
                            <Link href="/dashboard/messages" className="ml-auto text-[12px] font-medium text-link hover:underline">
                              Message
                            </Link>
                            {l.stage !== "won" && (
                              <button onClick={() => setStage(l.id, "lost")} className="grid h-7 w-7 place-items-center rounded-full text-faint hover:bg-mist hover:text-[#b3261e]" aria-label="Mark lost" title="Mark lost">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {col.length === 0 && <div className="rounded-2xl border-2 border-dashed border-line/70 px-3 py-6 text-center text-[12px] text-faint">Empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {lost.length > 0 && (
        <p className="mt-2 text-[13px] text-mute">
          {lost.length} lost {lost.length === 1 ? "lead" : "leads"} hidden ·{" "}
          <button className="text-link" onClick={() => lost.forEach((l) => setStage(l.id, "new"))}>
            Reopen all
          </button>
        </p>
      )}
    </>
  );
}

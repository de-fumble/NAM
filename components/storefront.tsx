"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BadgeCheck, CarFront, Clock, Cog, KeyRound, MapPin, MessageCircle, Phone, Store, Users } from "lucide-react";
import { useState } from "react";
import { ROLE_META } from "@/lib/data/businesses";
import { useAllFleet, useAllParts, useBusiness, useDB, useLiveCars } from "@/lib/db";
import { useApp, toast, withUser, useReady } from "@/lib/store";
import { act, paused } from "@/lib/gate";
import { img, naira } from "@/lib/utils";
import { CarCard, CarCardSkeleton, PartCard } from "./cards";
import { Avatar, Button, Container, Img, Sheet, Stars, easeApple } from "./ui";

export function Storefront({ id }: { id: string }) {
  const hydrated = useReady();
  const biz = useBusiness(id);
  const user = useApp((s) => s.user);
  const cars = useLiveCars().filter((c) => c.sellerId === id);
  const fleet = useAllFleet().filter((r) => r.companyId === id && r.status === "available");
  const parts = useAllParts().filter((p) => p.sellerId === id && p.active);
  const [msg, setMsg] = useState(false);

  if (!biz || (biz.status === "suspended" && user?.businessId !== id)) {
    if (!hydrated)
      return (
        <Container className="pt-[120px]">
          <div className="grid gap-6 sm:grid-cols-3">{[0, 1, 2].map((i) => <CarCardSkeleton key={i} />)}</div>
        </Container>
      );
    return (
      <Container className="flex min-h-[70vh] flex-col items-center justify-center pt-[64px] text-center">
        <Store className="h-12 w-12 text-faint" strokeWidth={1.2} />
        <h1 className="mt-4 text-[28px] font-semibold tracking-tight">Storefront not found</h1>
        <p className="mt-1 text-mute">This business may have moved or closed its store.</p>
        <Button href="/" className="mt-6">Back home</Button>
      </Container>
    );
  }

  const own = user?.businessId === id;
  const count = biz.type === "dealer" ? cars.length : biz.type === "rental" ? fleet.length : parts.length;
  const noun = biz.type === "dealer" ? "cars" : biz.type === "rental" ? "vehicles" : "products";
  const TypeIcon = biz.type === "dealer" ? CarFront : biz.type === "rental" ? KeyRound : Cog;

  return (
    <div className="pt-[64px]">
      <div className="relative h-[220px] overflow-hidden bg-black sm:h-[320px]">
        <Img src={img(biz.cover, 2000, { h: 700 })} alt="" className="absolute inset-0 !bg-black" imgClassName="opacity-80" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easeApple }}
          className="relative -mt-16 rounded-[28px] bg-white p-6 shadow-float sm:-mt-20 sm:p-8"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Avatar name={biz.name} hue={biz.hue} size={88} className="-mt-16 ring-[6px] ring-white sm:-mt-20" />
              <div>
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-mute">
                  <TypeIcon className="h-4 w-4" /> {ROLE_META[biz.type].label}
                </div>
                <h1 className="mt-1 flex items-center gap-2 text-[28px] font-semibold leading-tight tracking-tight sm:text-[36px]">
                  {biz.name}
                  {biz.verified && <BadgeCheck className="h-6 w-6 shrink-0 text-link" aria-label="Verified business" />}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-mute">
                  <span className="flex items-center gap-1.5"><Stars value={biz.rating} /> <span className="font-medium text-ink">{biz.rating}</span> ({biz.reviews.toLocaleString()})</span>
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {biz.city}, {biz.state}</span>
                  <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Replies in ~{biz.responseMins} min</span>
                  <span>Since {biz.since}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {own ? (
                <Button href="/dashboard/settings">Edit storefront</Button>
              ) : (
                <>
                  <Button onClick={() => act("messaging", () => setMsg(true))}><MessageCircle className="h-4 w-4" /> Message</Button>
                  <Button variant="outline" onClick={() => withUser(() => void (window.location.href = `tel:${biz.phone.replace(/\s/g, "")}`))}><Phone className="h-4 w-4" /> Call</Button>
                </>
              )}
            </div>
          </div>
          <p className="mt-6 max-w-3xl text-[16px] leading-relaxed text-ink-2">{biz.about}</p>
        </motion.div>

        <div className="mb-6 mt-12 flex items-end justify-between">
          <h2 className="text-[24px] font-semibold tracking-tight sm:text-[28px]">
            {count} {count === 1 ? noun.replace(/s$/, "") : noun}
          </h2>
        </div>

        {count === 0 ? (
          <div className="rounded-[24px] bg-white py-16 text-center text-mute shadow-card">Nothing listed right now — check back soon.</div>
        ) : biz.type === "dealer" ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{cars.map((c) => <CarCard key={c.id} car={c} />)}</div>
        ) : biz.type === "parts" ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">{parts.map((p) => <PartCard key={p.id} part={p} />)}</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {fleet.map((r) => (
              <Link key={r.id} href="/rentals" className="group overflow-hidden rounded-[24px] bg-white shadow-card ring-1 ring-black/[0.03] transition hover:-translate-y-0.5">
                <Img src={img(r.img, 800, { h: 500 })} alt={r.name} className="aspect-[8/5]" imgClassName="group-hover:scale-[1.04]" />
                <div className="p-5">
                  <div className="text-[12px] font-medium text-mute">{r.category}</div>
                  <h3 className="mt-0.5 text-[18px] font-semibold tracking-tight">{r.name}</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[13px] text-mute"><Users className="h-3.5 w-3.5" /> {r.seats} seats</span>
                    <span className="text-[15px]"><span className="font-semibold">{naira(r.daily)}</span><span className="text-mute">/day</span></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="h-24" />
      </Container>
      <MessageSheet open={msg} onClose={() => setMsg(false)} businessId={id} name={biz.name} />
    </div>
  );
}

function MessageSheet({ open, onClose, businessId, name }: { open: boolean; onClose: () => void; businessId: string; name: string }) {
  const send = useDB((s) => s.send);
  const user = useApp((s) => s.user);
  const router = useRouter();
  const [text, setText] = useState("");
  return (
    <Sheet open={open} onClose={onClose} title={`Message ${name}`}>
      <textarea
        autoFocus
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Hi, I'd like to ask about…"
        className="w-full resize-none rounded-2xl border border-line bg-white p-4 text-[16px] outline-none transition focus:border-link"
      />
      <Button
        size="lg"
        className="mt-4 w-full"
        disabled={!text.trim() || !user}
        onClick={() => {
          if (!user || paused("messaging")) return;
          send({ businessId, customer: { name: user.name, phone: user.phone }, topic: { kind: "general", title: `Enquiry for ${name}` }, from: "customer", text: text.trim() });
          setText("");
          onClose();
          toast({ title: "Message sent", body: "Replies appear in your dashboard.", tone: "success" });
          router.prefetch("/dashboard/messages");
        }}
      >
        Send message
      </Button>
    </Sheet>
  );
}

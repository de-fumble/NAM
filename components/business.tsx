"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, BarChart3, CalendarDays, Check, ClipboardList, MessageSquare, ShieldCheck, Truck, UsersRound, Wallet } from "lucide-react";
import { IMG } from "@/lib/data/images";
import { ROLE_META, type BizType } from "@/lib/data/businesses";
import { useApp, useUI } from "@/lib/store";
import { img } from "@/lib/utils";
import { ROLE_ICON } from "./overlays";
import { Button, Container, Img, Logo, Reveal, SectionHead, easeApple } from "./ui";

const TRACKS: { role: BizType; title: string; pitch: string; image: string; points: { icon: typeof Check; text: string }[] }[] = [
  {
    role: "dealer",
    title: "Your showroom, open to every buyer in Nigeria.",
    pitch: "List brand-new, tokunbo and Nigerian-used cars. Every enquiry, offer and inspection booking lands in one pipeline.",
    image: IMG.clsDark,
    points: [
      { icon: UsersRound, text: "Lead pipeline from first message to sold" },
      { icon: BarChart3, text: "Views and enquiries for every listing" },
      { icon: ShieldCheck, text: "Verified badge once your CAC is checked" },
    ],
  },
  {
    role: "rental",
    title: "Fill your fleet calendar.",
    pitch: "Self-drive and chauffeured bookings from travellers, corporates and wedding parties — approve each one in a tap.",
    image: IMG.bmw7,
    points: [
      { icon: CalendarDays, text: "14-day fleet calendar and approvals" },
      { icon: Wallet, text: "Track every booking from request to return" },
      { icon: MessageSquare, text: "Chat with renters before pickup" },
    ],
  },
  {
    role: "parts",
    title: "Sell parts to the whole country.",
    pitch: "From Ladipo to Nnewi to Wuse — reach drivers who know exactly what they need, and quote on the parts they can't find.",
    image: IMG.engine,
    points: [
      { icon: Truck, text: "Order fulfilment with NAM Express delivery" },
      { icon: ClipboardList, text: "Quote on buyer part requests" },
      { icon: BarChart3, text: "Stock alerts and sales reports" },
    ],
  },
];

export function BusinessLanding() {
  const setAuth = useUI((s) => s.setAuth);
  const user = useApp((s) => s.user);
  const isBiz = user && user.role !== "customer";
  const start = (role: BizType) => setAuth(true, role);

  return (
    <div className="pt-[64px]">
      <section className="relative overflow-hidden bg-black text-white">
        <Img src={img(IMG.workshop, 2200, { h: 1100 })} alt="" className="absolute inset-0 !bg-black" imgClassName="opacity-50" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
        <Container className="relative pb-20 pt-20 text-center sm:pb-28 sm:pt-28">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: easeApple }} className="flex flex-col items-center">
            <Logo dark size={96} href={null} />
            <h1 className="headline mt-8 max-w-3xl text-balance text-[44px] sm:text-[72px]">Grow your auto business.</h1>
            <p className="mt-4 max-w-xl text-balance text-[17px] text-white/70 sm:text-[21px]">
              One marketplace for dealers, rental companies and parts sellers — with a dashboard that runs the day-to-day for you.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              {isBiz ? (
                <Button size="lg" variant="light" href="/dashboard">Go to your dashboard <ArrowRight className="h-4 w-4" /></Button>
              ) : (
                <>
                  <Button size="lg" variant="light" onClick={() => start("dealer")}>Start selling — it&apos;s free</Button>
                  <Button size="lg" variant="ghost" className="text-white hover:bg-white/10" href="#tracks">See how it works</Button>
                </>
              )}
            </div>
          </motion.div>
        </Container>
      </section>

      <Container className="py-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[24px] bg-hair sm:grid-cols-4">
          {[
            ["2.1M", "monthly shoppers"],
            ["4,800+", "verified businesses"],
            ["36", "states + FCT"],
            ["₦0", "to list"],
          ].map(([v, l]) => (
            <div key={l} className="bg-white px-5 py-6 text-center">
              <div className="text-[28px] font-semibold tracking-tight tabular-nums sm:text-[34px]">{v}</div>
              <div className="text-[13px] text-mute">{l}</div>
            </div>
          ))}
        </div>
      </Container>

      <div id="tracks" className="scroll-mt-20">
        {TRACKS.map((t, i) => {
          const Icon = ROLE_ICON[t.role];
          return (
            <section key={t.role} id={t.role} className="scroll-mt-20 py-14 sm:py-20">
              <Container className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                <Reveal>
                  <Img src={img(t.image, 1200, { h: 900 })} alt="" className="aspect-[4/3] rounded-[28px] shadow-float" />
                </Reveal>
                <Reveal delay={0.1}>
                  <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[13px] font-semibold text-brand">
                    <Icon className="h-4 w-4" /> For {ROLE_META[t.role].label.toLowerCase()}s
                  </div>
                  <h2 className="headline mt-4 text-balance text-[32px] sm:text-[44px]">{t.title}</h2>
                  <p className="mt-3 text-[17px] leading-relaxed text-mute sm:text-[19px]">{t.pitch}</p>
                  <ul className="mt-6 space-y-3">
                    {t.points.map((p) => (
                      <li key={p.text} className="flex items-center gap-3 text-[16px]">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-mist"><p.icon className="h-4 w-4 text-ink-2" /></span>
                        {p.text}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button onClick={() => start(t.role)}>Join as a {ROLE_META[t.role].label.toLowerCase()}</Button>
                    <Button variant="outline" onClick={() => setAuth(true)}>Try the demo account</Button>
                  </div>
                </Reveal>
              </Container>
            </section>
          );
        })}
      </div>

      <section className="bg-white py-16 sm:py-24">
        <Container>
          <SectionHead eyebrow="Simple pricing" title="Free to list." sub="No subscription and no setup fee." />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { t: "Sign up in minutes", b: "Verify your phone, add your business name and you're live. Upload your CAC to earn the verified badge." },
              { t: "Manage it all in one place", b: "Listings, leads, bookings, orders, messages and payouts — on your phone or laptop." },
              { t: "Close the deal", b: "Chat with buyers, agree the price and meet them in person to hand over." },
            ].map((s, i) => (
              <Reveal key={s.t} delay={i * 0.08} className="rounded-[24px] bg-paper p-7">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-ink text-[15px] font-semibold text-white">{i + 1}</div>
                <h3 className="mt-5 text-[19px] font-semibold tracking-tight">{s.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-mute">{s.b}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-2 text-[14px] text-mute"><BadgeCheck className="h-4 w-4 text-link" /> Trusted by Prestige Autos, Lagos Luxe Rentals, Ladipo Genuine Parts and thousands more.</div>
            <Link href="/dashboard" className="text-[15px] font-medium text-link hover:underline">Already selling? Open your dashboard →</Link>
          </div>
        </Container>
      </section>
    </div>
  );
}

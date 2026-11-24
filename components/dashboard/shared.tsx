"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, Banknote, CircleCheckBig, FileCheck, Landmark, MessageSquare, RotateCcw, Send, Upload, Wallet } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ROLE_META } from "@/lib/data/businesses";
import { STATES } from "@/lib/data/cars";
import { getBusiness, orderStatus, useBusiness, useDB, useSettings, type Thread } from "@/lib/db";
import { push } from "@/lib/sync";
import { useApp, toast } from "@/lib/store";
import { paused } from "@/lib/gate";
import { cn, naira, nairaShort, sleep } from "@/lib/utils";
import { Avatar, Button, Field, Input, Select, Sheet, Toggle, easeApple } from "../ui";
import { BarChart, Empty, PageHead, Panel, Stat, Status, series, td, th, timeAgo } from "./kit";

/* --------------------------------- Messages -------------------------------- */

const QUICK_BIZ = ["Yes, it's still available.", "When would you like to come and see it?", "The price is slightly negotiable.", "I've sent the details on WhatsApp."];
const QUICK_CUST = ["Is it still available?", "What's your best price?", "Can I come today?", "Please share more photos."];

export function Messages() {
  const user = useApp((s) => s.user)!;
  const threads = useDB((s) => s.threads);
  const reply = useDB((s) => s.reply);
  const markRead = useDB((s) => s.markRead);
  const sellerIds = useMemo(() => [user.businessId, `u:${user.phone}`].filter(Boolean) as string[], [user.businessId, user.phone]);
  /** Which side of a conversation am I on? Private sellers are "biz" on their own listings. */
  const sideOf = (t: Thread): "biz" | "cust" => (sellerIds.includes(t.businessId) ? "biz" : "cust");
  const isBizUser = user.role !== "customer";
  const mine = useMemo(
    () => threads.filter((t) => t.customer.phone === user.phone || sellerIds.includes(t.businessId)).sort((a, b) => b.at - a.at),
    [threads, user.phone, sellerIds],
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const active = mine.find((t) => t.id === openId) ?? null;
  const side = active ? sideOf(active) : isBizUser ? "biz" : "cust";

  useEffect(() => {
    if (!openId && mine.length && window.matchMedia("(min-width: 1024px)").matches) setOpenId(mine[0].id);
  }, [mine, openId]);

  useEffect(() => {
    if (!active) return;
    const s = sellerIds.includes(active.businessId) ? "biz" : "cust";
    if (s === "biz" ? active.unreadBiz : active.unreadCust) markRead(active.id, s);
    { const box = endRef.current?.parentElement; if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" }); }
  }, [active, sellerIds, markRead]);

  const other = (t: Thread) => (sideOf(t) === "cust" ? getBusiness(t.businessId)?.name ?? "Private seller" : t.customer.name);
  const unread = (t: Thread) => (sideOf(t) === "cust" ? t.unreadCust : t.unreadBiz);
  const send = (msg: string) => {
    if (!active || !msg.trim() || paused("messaging")) return;
    reply(active.id, side === "cust" ? "customer" : "business", msg.trim());
    setText("");
  };
  const topicHref = (t: Thread) =>
    t.topic.kind === "car" ? `/cars/${t.topic.id}` : t.topic.kind === "part" ? `/parts?open=${t.topic.id}` : t.topic.kind === "rental" ? "/rentals" : "/dashboard/requests";

  return (
    <>
      <PageHead title="Messages" sub={isBizUser ? "Every enquiry from buyers, in one inbox." : "Your conversations with dealers and sellers."} />
      {mine.length === 0 ? (
        <Panel>
          <Empty icon={MessageSquare} title="No messages yet" body={isBizUser ? "When buyers contact you about a listing, it shows up here." : "Message a seller from any listing and the conversation lands here."} />
        </Panel>
      ) : (
        <div className="grid h-[calc(100dvh-220px)] min-h-[520px] overflow-hidden rounded-[24px] bg-white shadow-card ring-1 ring-black/[0.03] lg:grid-cols-[320px_1fr]">
          <ul className={cn("overflow-y-auto border-hair lg:border-r", active && "hidden lg:block")}>
            {mine.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setOpenId(t.id)}
                  className={cn("flex w-full items-start gap-3 border-b border-hair px-4 py-3.5 text-left transition", active?.id === t.id ? "bg-mist" : "hover:bg-mist/60")}
                >
                  <Avatar name={other(t)} hue={other(t).length * 29} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-[14px]", unread(t) ? "font-semibold" : "font-medium")}>{other(t)}</span>
                      <span className="shrink-0 text-[11px] text-faint">{timeAgo(t.at)}</span>
                    </span>
                    <span className="block truncate text-[12px] text-brand-ink">{t.topic.title}</span>
                    <span className={cn("block truncate text-[13px]", unread(t) ? "text-ink" : "text-mute")}>
                      {t.messages[t.messages.length - 1].from === (sideOf(t) === "cust" ? "customer" : "business") && "You: "}
                      {t.messages[t.messages.length - 1].text}
                    </span>
                  </span>
                  {!!unread(t) && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-link" aria-label={`${unread(t)} unread`} />}
                </button>
              </li>
            ))}
          </ul>

          <div className={cn("flex min-h-0 flex-col", !active && "hidden lg:flex")}>
            {active ? (
              <>
                <div className="flex items-center gap-3 border-b border-hair px-4 py-3">
                  <button onClick={() => setOpenId(null)} className="grid h-8 w-8 place-items-center rounded-full bg-mist lg:hidden" aria-label="Back">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Avatar name={other(active)} hue={other(active).length * 29} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold">{other(active)}</div>
                    <Link href={topicHref(active)} className="block truncate text-[12px] text-link hover:underline">
                      {active.topic.title}
                    </Link>
                  </div>
                  {side === "biz" && <span className="hidden text-[12px] text-faint sm:block">{active.customer.phone}</span>}
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
                  {active.messages.map((m, i) => {
                    const me = m.from === (side === "cust" ? "customer" : "business");
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", me ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[78%] rounded-[20px] px-4 py-2 text-[15px] leading-snug", me ? "rounded-br-md bg-link text-white" : "rounded-bl-md bg-mist")}>
                          {m.text}
                          <div className={cn("mt-0.5 text-[10px]", me ? "text-white/60" : "text-faint")}>{timeAgo(m.at)}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
                  {(side === "biz" ? QUICK_BIZ : QUICK_CUST).map((q) => (
                    <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[12px] hover:border-ink">
                      {q}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(text);
                  }}
                  className="m-3 mt-1 flex items-center gap-2 rounded-full bg-mist p-1 pl-4"
                >
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Reply to ${other(active).split(" ")[0]}…`} className="h-10 flex-1 bg-transparent text-[15px] outline-none" />
                  <button type="submit" disabled={!text.trim()} className="grid h-9 w-9 place-items-center rounded-full bg-link text-white transition disabled:opacity-30" aria-label="Send">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="grid flex-1 place-items-center text-[14px] text-faint">Select a conversation</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* --------------------------------- Payouts -------------------------------- */

export function Payouts() {
  const user = useApp((s) => s.user)!;
  const biz = user.businessId!;
  const leads = useDB((s) => s.leads);
  const orders = useDB((s) => s.orders);
  const bookings = useDB((s) => s.bookings);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { available, pending } = useMemo(() => {
    if (user.role === "dealer") {
      const mine = leads.filter((l) => l.businessId === biz && l.amount);
      return { available: mine.filter((l) => l.stage === "won").reduce((a, l) => a + (l.amount ?? 0), 0), pending: mine.filter((l) => l.stage === "negotiating").reduce((a, l) => a + (l.amount ?? 0), 0) };
    }
    if (user.role === "rental") {
      const mine = bookings.filter((b) => b.companyId === biz);
      return { available: mine.filter((b) => b.status === "completed").reduce((a, b) => a + b.total, 0), pending: mine.filter((b) => b.status === "confirmed" || b.status === "active").reduce((a, b) => a + b.total, 0) };
    }
    const sum = (o: (typeof orders)[number]) => o.lines.filter((l) => l.sellerId === biz).reduce((a, l) => a + l.price * l.qty, 0);
    const mine = orders.filter((o) => o.fulfil[biz]);
    return { available: mine.filter((o) => o.fulfil[biz] === "delivered").reduce((a, o) => a + sum(o), 0), pending: mine.filter((o) => o.fulfil[biz] !== "delivered" && o.fulfil[biz] !== "cancelled").reduce((a, o) => a + sum(o), 0) };
  }, [user.role, biz, leads, orders, bookings]);

  const feePct = useSettings().feePercent;
  const fee = Math.round((available * feePct) / 100);
  const weekly = series(`${biz}-payouts`, 8, user.role === "dealer" ? 9_000_000 : user.role === "rental" ? 1_400_000 : 380_000, user.role === "dealer" ? 6_000_000 : 600_000, 0.02).map((d, i) => ({ ...d, label: `Wk ${i + 1}` }));
  const history = weekly.slice(0, 6).reverse().map((w, i) => ({ id: `PO-${7712 - i * 13}`, amount: w.value, when: Date.now() - (i + 1) * 7 * 86_400_000 }));

  return (
    <>
      <PageHead
        title="Payouts"
        sub="Funds are paid out to you once the buyer confirms delivery."
        action={
          <Button onClick={() => setOpen(true)} disabled={available - fee <= 0}>
            <Banknote className="h-4 w-4" /> Withdraw
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Available to withdraw" value={nairaShort(available - fee)} hint={`after ${feePct}% fee (${nairaShort(fee)})`} icon={Wallet} />
        <Stat label="Pending" value={nairaShort(pending)} hint="released on confirmation" icon={Landmark} />
        <Stat label="Paid out (8 weeks)" value={nairaShort(weekly.reduce((a, w) => a + w.value, 0))} delta={12} hint="vs previous 8 weeks" icon={Banknote} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Weekly payouts">
          <BarChart data={weekly} format={nairaShort} height={200} />
        </Panel>
        <Panel title="Recent transfers" pad={false}>
          <table className="w-full">
            <tbody className="divide-y divide-hair">
              {history.map((h) => (
                <tr key={h.id}>
                  <td className={td}>
                    <div className="font-medium tabular-nums">{naira(h.amount)}</div>
                    <div className="text-[12px] text-faint">{h.id} · Bank ••4821</div>
                  </td>
                  <td className={cn(td, "text-right")}>
                    <Status tone="good">Paid</Status>
                    <div className="mt-1 text-[11px] text-faint">{new Date(h.when).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Withdraw to bank">
        <div className="pb-2">
          <div className="rounded-2xl bg-mist p-4">
            <div className="text-[13px] text-mute">Amount</div>
            <div className="text-[32px] font-semibold tabular-nums">{naira(available - fee)}</div>
            <div className="mt-1 text-[13px] text-mute">To settlement account ••4821 · arrives in minutes</div>
          </div>
          <Button
            className="mt-5 w-full"
            size="lg"
            variant="brand"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await sleep(1100);
              setBusy(false);
              setOpen(false);
              toast({ title: "Withdrawal on its way", body: naira(available - fee), tone: "success" });
            }}
          >
            Confirm withdrawal
          </Button>
        </div>
      </Sheet>
    </>
  );
}

/* --------------------------------- Settings -------------------------------- */

export function Settings() {
  const user = useApp((s) => s.user)!;
  const signIn = useApp((s) => s.signIn);
  const signOut = useApp((s) => s.signOut);
  const reset = useDB((s) => s.reset);
  const update = useDB((s) => s.updateBusiness);
  const biz = useBusiness(user.businessId);
  const isBiz = user.role !== "customer";
  const [form, setForm] = useState({ name: biz?.name ?? user.name, tagline: biz?.tagline ?? "", about: biz?.about ?? "", city: biz?.city ?? "", state: biz?.state ?? "Lagos", phone: biz?.phone ?? user.phone });
  const [cac, setCac] = useState("");
  const [docs, setDocs] = useState<Record<string, boolean>>({ id: !!biz?.verified, address: !!biz?.verified });
  const [submitted, setSubmitted] = useState(false);
  const [notify, setNotify] = useState({ sms: true, email: false, whatsapp: true });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await sleep(700);
    if (isBiz && user.businessId) update(user.businessId, { name: form.name, tagline: form.tagline, about: form.about, city: form.city, state: form.state, phone: form.phone });
    else signIn({ ...user, name: form.name });
    setSaving(false);
    toast({ title: "Saved", tone: "success" });
  };

  const verifiedSteps = [true, biz?.verified || cac.length >= 7, docs.id, docs.address];
  const done = verifiedSteps.filter(Boolean).length;

  return (
    <>
      <PageHead title={isBiz ? "Storefront & settings" : "Account"} sub={isBiz ? "How buyers see your business across Naija Auto Market." : "Your profile and preferences."} />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title={isBiz ? "Business profile" : "Profile"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={isBiz ? "Business name" : "Full name"} className="sm:col-span-2">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            {isBiz && (
              <>
                <Field label="Tagline" className="sm:col-span-2">
                  <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="e.g. Lagos' most trusted tokunbo dealer" />
                </Field>
                <Field label="About" className="sm:col-span-2">
                  <textarea
                    rows={4}
                    value={form.about}
                    onChange={(e) => setForm({ ...form, about: e.target.value })}
                    className="w-full resize-none rounded-xl border border-line px-4 py-3 text-[15px] outline-none transition focus:border-link focus:shadow-[0_0_0_4px_rgb(0_102_204/0.12)]"
                  />
                </Field>
                <Field label="State">
                  <Select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                    {STATES.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                </Field>
                <Field label="City / area">
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </Field>
              </>
            )}
            <Field label="Phone" className="sm:col-span-2" hint={isBiz ? "Shown to buyers who tap Call or WhatsApp." : undefined}>
              <Input value={form.phone} disabled={!isBiz} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button loading={saving} onClick={save}>
              Save changes
            </Button>
            {isBiz && (
              <Button variant="secondary" href={`/store/${user.businessId}`}>
                Preview storefront
              </Button>
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          {isBiz && (
            <Panel title="Verification" action={<span className="text-[13px] tabular-nums text-mute">{done}/4</span>}>
              <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-hair">
                <motion.div className="h-full rounded-full bg-brand" animate={{ width: `${(done / 4) * 100}%` }} transition={{ duration: 0.6, ease: easeApple }} />
              </div>
              <ul className="space-y-3 text-[14px]">
                <VerifyRow done label="Phone number" />
                <li>
                  <VerifyRow done={!!verifiedSteps[1]} label="CAC registration" />
                  {!verifiedSteps[1] && <Input className="mt-2 h-10" placeholder="RC / BN number" value={cac} onChange={(e) => setCac(e.target.value.toUpperCase())} />}
                </li>
                <li className="flex items-center justify-between gap-2">
                  <VerifyRow done={!!docs.id} label="Director's ID (NIN / passport)" />
                  {!docs.id && <UploadBtn onDone={() => setDocs({ ...docs, id: true })} />}
                </li>
                <li className="flex items-center justify-between gap-2">
                  <VerifyRow done={!!docs.address} label="Showroom / office address" />
                  {!docs.address && <UploadBtn onDone={() => setDocs({ ...docs, address: true })} />}
                </li>
              </ul>
              {submitted && !biz?.verified && <p className="mt-5 rounded-xl bg-mist px-4 py-3 text-[13px] text-mute">Under review — we&apos;ll notify you once an admin approves your documents.</p>}
              {done === 4 && !biz?.verified && !submitted && (
                <Button
                  className="mt-5 w-full"
                  variant="brand"
                  onClick={() => {
                    if (useDB.getState().remote) {
                      push("business.update", { id: user.businessId, patch: { verified: true } });
                      setSubmitted(true);
                      toast({ title: "Submitted for review", body: "Our team checks documents within 24 hours. You'll get the blue tick once approved.", tone: "success" });
                    } else {
                      update(user.businessId!, { verified: true });
                      toast({ title: "Verified badge granted", body: "Buyers now see the blue tick on your listings.", tone: "success" });
                    }
                  }}
                >
                  <BadgeCheck className="h-4 w-4" /> Submit for review
                </Button>
              )}
            </Panel>
          )}
          <Panel title="Notifications">
            <Toggle checked={notify.sms} onChange={(v) => setNotify({ ...notify, sms: v })} label="SMS alerts" />
            <Toggle checked={notify.whatsapp} onChange={(v) => setNotify({ ...notify, whatsapp: v })} label="WhatsApp alerts" />
            <Toggle checked={notify.email} onChange={(v) => setNotify({ ...notify, email: v })} label="Email summaries" />
          </Panel>
          <Panel title="Account">
            <div className="text-[13px] text-mute">
              Signed in as {ROLE_META[user.role].label.toLowerCase()} · {user.phone}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" className="h-9" onClick={() => signOut()}>
                Sign out
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-mute"
                onClick={() => {
                  reset();
                  toast({ title: "Demo data reset", tone: "success" });
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset demo data
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function VerifyRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.span key="d" initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid h-6 w-6 place-items-center rounded-full bg-brand text-white">
            <CircleCheckBig className="h-3.5 w-3.5" />
          </motion.span>
        ) : (
          <motion.span key="n" className="h-6 w-6 rounded-full border-2 border-dashed border-line" />
        )}
      </AnimatePresence>
      <span className={done ? "text-ink" : "text-ink-2"}>{label}</span>
    </div>
  );
}

function UploadBtn({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        onClick={() => ref.current?.click()}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-mist px-3 text-[12px] font-medium hover:bg-hair"
      >
        {busy ? <FileCheck className="h-3.5 w-3.5 animate-pulse" /> : <Upload className="h-3.5 w-3.5" />} {busy ? "Uploading" : "Upload"}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={async (e) => {
          if (!e.target.files?.length) return;
          setBusy(true);
          await sleep(900);
          setBusy(false);
          onDone();
        }}
      />
    </>
  );
}

/** Re-export for dashboards that show order state from the customer side. */
export { orderStatus };

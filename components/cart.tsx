"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Banknote, CircleCheckBig, CreditCard, Lock, Minus, Plus, ShoppingBag, Smartphone, Trash2, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { STATES } from "@/lib/data/cars";
import { useAllParts, useDB, useEngine } from "@/lib/db";
import { partsTotals } from "@/lib/engines";
import { act, paused } from "@/lib/gate";
import { useApp, useReady } from "@/lib/store";
import { cn, naira, sleep } from "@/lib/utils";
import { PartVisual } from "./cards";
import { Button, Container, Field, Input, Select, Skeleton, Ticker, easeApple } from "./ui";

const PAY = [
  { k: "card", l: "Card", s: "Visa, Mastercard, Verve", icon: CreditCard },
  { k: "transfer", l: "Bank transfer", s: "Instant account number", icon: Banknote },
  { k: "ussd", l: "USSD", s: "Any Nigerian bank", icon: Smartphone },
  { k: "pod", l: "Pay on delivery", s: "Lagos & Abuja only", icon: Truck },
] as const;

export function Cart() {
  const hydrated = useReady();
  const cart = useApp((s) => s.cart);
  const user = useApp((s) => s.user);
  const setQty = useApp((s) => s.setQty);
  const remove = useApp((s) => s.removeFromCart);
  const clear = useApp((s) => s.clearCart);
  const [stage, setStage] = useState<"bag" | "checkout" | "done">("bag");
  const [state, setState] = useState("Lagos");
  const [pay, setPay] = useState<(typeof PAY)[number]["k"]>("card");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState("");
  const [form, setForm] = useState({ name: user?.name ?? "", phone: user?.phone ?? "", address: "" });

  const parts = useAllParts();
  const placeOrder = useDB((s) => s.placeOrder);
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name, phone: f.phone || user.phone }));
  }, [user]);
  // Delivery, VAT and quantity limits come from Admin → Engines → Parts shop (the server charges the same).
  const { params: rules } = useEngine("parts");
  const maxQty = Number(rules.maxQty);
  const lines = cart.map((l) => ({ ...l, qty: Math.min(l.qty, maxQty), part: parts.find((p) => p.id === l.id)! })).filter((l) => l.part);
  const subtotal = lines.reduce((a, l) => a + l.part.price * l.qty, 0);
  const { delivery, vat, total, freeOver, vatPercent } = partsTotals(subtotal, state, rules);

  const place = async () => {
    if (paused("parts")) return;
    setBusy(true);
    await sleep(1400);
    const id = placeOrder({
      customer: { name: form.name, phone: user?.phone ?? form.phone },
      address: form.address,
      state,
      pay,
      lines: lines.map((l) => ({ partId: l.part.id, name: l.part.name, qty: l.qty, price: l.part.price, sellerId: l.part.sellerId })),
      subtotal,
      delivery,
      vat,
      total,
    });
    setBusy(false);
    setOrder(id);
    setStage("done");
    clear();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!hydrated)
    return (
      <Container className="pt-[112px]">
        <Skeleton className="h-12 w-48" />
        <div className="mt-10 space-y-4">
          {[0, 1].map((i) => <Skeleton key={i} className="h-28 w-full rounded-[22px]" />)}
        </div>
      </Container>
    );

  if (stage === "done")
    return (
      <Container className="flex min-h-[75vh] max-w-lg flex-col items-center justify-center pt-[64px] text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 15 }}>
          <CircleCheckBig className="h-20 w-20 text-brand" strokeWidth={1.2} />
        </motion.div>
        <h1 className="headline mt-6 text-[40px]">Order placed.</h1>
        <p className="mt-2 text-[17px] text-mute">
          Order <span className="font-semibold text-ink">{order}</span> is with the seller. Track every step from your dashboard as it ships to {state}.
        </p>
        <div className="mt-8 flex gap-3">
          <Button href="/dashboard/orders">Track order</Button>
          <Button href="/parts" variant="secondary">Keep shopping</Button>
        </div>
      </Container>
    );

  if (lines.length === 0)
    return (
      <Container className="flex min-h-[75vh] flex-col items-center justify-center pt-[64px] text-center">
        <ShoppingBag className="h-14 w-14 text-faint" strokeWidth={1.2} />
        <h1 className="headline mt-5 text-[36px]">Your bag is empty.</h1>
        <p className="mt-2 text-[17px] text-mute">Genuine parts, delivered tomorrow in Lagos and Abuja.</p>
        <Button href="/parts" className="mt-8">Shop parts</Button>
      </Container>
    );

  return (
    <div className="pt-[64px]">
      <Container className="pt-10 sm:pt-14">
        <h1 className="headline text-[40px] sm:text-[52px]">{stage === "bag" ? "Your bag." : "Checkout."}</h1>
        <p className="mt-2 text-[17px] text-mute">
          {stage === "bag" ? (freeOver <= 0 ? "Delivery is charged by state." : subtotal >= freeOver ? "You've unlocked free delivery." : `Add ${naira(freeOver - subtotal)} more for free delivery.`) : "Secure checkout"}
        </p>
        <div className="mt-4 h-1 max-w-md overflow-hidden rounded-full bg-hair">
          <motion.div className="h-full rounded-full bg-brand" animate={{ width: `${freeOver > 0 ? Math.min(100, (subtotal / freeOver) * 100) : 0}%` }} transition={{ duration: 0.8, ease: easeApple }} />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <AnimatePresence mode="wait">
              {stage === "bag" ? (
                <motion.ul key="bag" exit={{ opacity: 0, x: -20 }} className="divide-y divide-hair border-y border-hair">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => (
                      <motion.li
                        key={l.id}
                        layout
                        exit={{ opacity: 0, height: 0, transition: { duration: 0.35, ease: easeApple } }}
                        className="flex gap-4 overflow-hidden py-6 sm:gap-6"
                      >
                        <Link href={`/parts?open=${l.id}`}>
                          <PartVisual category={l.part.category} className="h-24 w-24 rounded-2xl sm:h-32 sm:w-32 [&_svg]:h-12 [&_svg]:w-12" />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-[12px] text-faint">{l.part.brand}</div>
                              <div className="text-[17px] font-semibold leading-snug tracking-tight">{l.part.name}</div>
                              <div className="mt-1 text-[13px] text-mute">Sold by {l.part.seller}</div>
                            </div>
                            <div className="shrink-0 text-[17px] font-semibold tabular-nums">{naira(l.part.price * l.qty)}</div>
                          </div>
                          <div className="mt-auto flex items-center justify-between pt-3">
                            <div className="flex items-center rounded-full bg-mist p-1">
                              <button onClick={() => (l.qty === 1 ? remove(l.id) : setQty(l.id, l.qty - 1))} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white" aria-label="Decrease">
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-7 text-center text-[14px] font-semibold tabular-nums">{l.qty}</span>
                              <button onClick={() => setQty(l.id, l.qty + 1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white" aria-label="Increase">
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <button onClick={() => remove(l.id)} className="inline-flex items-center gap-1 text-[13px] text-link hover:underline">
                              <Trash2 className="h-3.5 w-3.5" /> Remove
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>
              ) : (
                <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: easeApple }} className="space-y-10">
                  <section>
                    <h2 className="text-[21px] font-semibold tracking-tight">Delivery details</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Field label="Full name">
                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Adaeze Okonkwo" />
                      </Field>
                      <Field label="Phone">
                        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234 803 123 4567" inputMode="tel" />
                      </Field>
                      <Field label="Street address" className="sm:col-span-2">
                        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="12 Admiralty Way, Lekki Phase 1" />
                      </Field>
                      <Field label="State">
                        <Select value={state} onChange={(e) => setState(e.target.value)}>
                          {STATES.map((s) => <option key={s}>{s}</option>)}
                        </Select>
                      </Field>
                    </div>
                  </section>
                  <section>
                    <h2 className="text-[21px] font-semibold tracking-tight">Payment</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {PAY.map((p) => (
                        <button
                          key={p.k}
                          onClick={() => setPay(p.k)}
                          className={cn("flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition", pay === p.k ? "border-ink bg-white" : "border-hair hover:border-line")}
                        >
                          <span className={cn("grid h-10 w-10 place-items-center rounded-xl transition", pay === p.k ? "bg-ink text-white" : "bg-mist")}>
                            <p.icon className="h-5 w-5" />
                          </span>
                          <span>
                            <span className="block text-[15px] font-semibold">{p.l}</span>
                            <span className="block text-[12px] text-mute">{p.s}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <aside className="lg:sticky lg:top-[88px] lg:self-start">
            <div className="rounded-[28px] bg-white p-6 shadow-card ring-1 ring-black/[0.03]">
              <h3 className="text-[19px] font-semibold tracking-tight">Summary</h3>
              <dl className="mt-4 space-y-3 text-[15px]">
                <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd className="tabular-nums"><Ticker value={subtotal} format={naira} /></dd></div>
                <div className="flex justify-between"><dt className="text-mute">Delivery to {state}</dt><dd className="tabular-nums">{delivery === 0 ? <span className="text-brand">Free</span> : naira(delivery)}</dd></div>
                <div className="flex justify-between"><dt className="text-mute">VAT ({vatPercent}%)</dt><dd className="tabular-nums"><Ticker value={vat} format={naira} /></dd></div>
                <div className="flex justify-between border-t border-hair pt-3 text-[19px] font-semibold"><dt>Total</dt><dd className="tabular-nums"><Ticker value={total} format={naira} /></dd></div>
              </dl>
              {stage === "bag" ? (
                <Button size="lg" className="mt-6 w-full" onClick={() => act("parts", () => { setStage("checkout"); window.scrollTo({ top: 0, behavior: "smooth" }); })}>
                  Check out
                </Button>
              ) : (
                <>
                  <Button size="lg" variant="brand" className="mt-6 w-full" loading={busy} disabled={!form.name || !form.phone || !form.address} onClick={place}>
                    <Lock className="h-4 w-4" /> Pay {naira(total)}
                  </Button>
                  <button onClick={() => setStage("bag")} className="mt-3 w-full text-center text-[14px] text-link">Back to bag</button>
                </>
              )}
              <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-faint">
                <Lock className="h-3 w-3" /> Payments are encrypted.
              </p>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}

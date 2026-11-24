"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, ClipboardList, Inbox, Minus, Package, Plus, Send, TrendingUp, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { ORDER_FLOW, useAllParts, useBusiness, useDB, type Order, type OrderStatus, type PartRequest } from "@/lib/db";
import { PART_CATEGORIES, type PartCategory } from "@/lib/data/parts";
import { useApp, toast } from "@/lib/store";
import { paused } from "@/lib/gate";
import { cn, naira, nairaShort } from "@/lib/utils";
import { Avatar, Button, Field, Input, Select, Sheet, Toggle } from "../ui";
import { PartVisual } from "../cards";
import { greeting } from "./dealer";
import { BarChart, Empty, PageHead, Panel, PanelLink, Stat, Status, Tabs, series, td, th, timeAgo, type Tone } from "./kit";

export const ORDER_TONE: Record<OrderStatus, { tone: Tone; label: string }> = {
  placed: { tone: "warning", label: "New order" },
  packed: { tone: "info", label: "Packed" },
  shipped: { tone: "info", label: "Shipped" },
  delivered: { tone: "good", label: "Delivered" },
  cancelled: { tone: "critical", label: "Cancelled" },
};
const NEXT_LABEL: Partial<Record<OrderStatus, string>> = { placed: "Mark packed", packed: "Hand to rider", shipped: "Confirm delivery" };

function useSeller() {
  const user = useApp((s) => s.user)!;
  const id = user.businessId!;
  const all = useAllParts();
  const orders = useDB((s) => s.orders);
  const products = useMemo(() => all.filter((p) => p.sellerId === id), [all, id]);
  const mine = useMemo(() => orders.filter((o) => o.fulfil[id]).sort((a, b) => b.at - a.at), [orders, id]);
  return { id, products, orders: mine };
}

/** Only the lines this seller is responsible for. */
const myLines = (o: Order, id: string) => o.lines.filter((l) => l.sellerId === id);
const myTotal = (o: Order, id: string) => myLines(o, id).reduce((a, l) => a + l.price * l.qty, 0);

/* --------------------------------- Overview -------------------------------- */

export function PartsOverview() {
  const { id, products, orders } = useSeller();
  const patch = useDB((s) => s.patchPart);
  const requests = useDB((s) => s.requests);
  const toShip = orders.filter((o) => o.fulfil[id] === "placed" || o.fulfil[id] === "packed");
  const low = products.filter((p) => p.active && p.stock <= 10).sort((a, b) => a.stock - b.stock);
  const sales = useMemo(() => series(`${id}-sales`, 14, 160_000, 140_000).map((d) => ({ ...d, label: d.label })), [id]);
  const openReqs = requests.filter((r) => r.status === "open" && !r.quotes.some((q) => q.businessId === id));

  return (
    <>
      <PageHead
        title={`Good ${greeting()}.`}
        sub={`${toShip.length} ${toShip.length === 1 ? "order" : "orders"} to fulfil · ${openReqs.length} buyers looking for parts.`}
        action={<Button href="/dashboard/products"><Plus className="h-4 w-4" /> Add product</Button>}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="To fulfil" value={toShip.length} hint="ship within 24h" icon={Inbox} />
        <Stat label="Sales · 14 days" value={nairaShort(sales.reduce((a, d) => a + d.value, 0))} delta={9} icon={TrendingUp} />
        <Stat label="Active products" value={products.filter((p) => p.active).length} hint={`${products.length} in catalogue`} icon={Package} />
        <Stat label="Low stock" value={low.length} hint="10 units or fewer" icon={AlertTriangle} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Daily sales" action={<span className="text-[12px] text-faint">Last 14 days</span>}>
          <BarChart data={sales} format={nairaShort} />
        </Panel>
        <Panel title="Needs action" action={<PanelLink href="/dashboard/orders">All orders</PanelLink>} pad={false}>
          {toShip.length === 0 ? (
            <Empty icon={Check} title="Every order is on its way" />
          ) : (
            <ul className="divide-y divide-hair">
              {toShip.slice(0, 5).map((o) => (
                <li key={o.id} className="flex items-center gap-3 px-6 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium">{o.id} · {o.customer.name}</div>
                    <div className="truncate text-[12px] text-mute">{myLines(o, id).map((l) => `${l.qty}× ${l.name}`).join(", ")}</div>
                  </div>
                  <Status tone={ORDER_TONE[o.fulfil[id]].tone}>{ORDER_TONE[o.fulfil[id]].label}</Status>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Low stock" className="mt-4" pad={false} action={<PanelLink href="/dashboard/products">Products</PanelLink>}>
        {low.length === 0 ? (
          <Empty icon={Package} title="Stock levels look healthy" />
        ) : (
          <ul className="divide-y divide-hair">
            {low.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-6 py-3">
                <PartVisual category={p.category} className="h-11 w-11 shrink-0 rounded-xl" small />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">{p.name}</div>
                  <div className="text-[12px] text-mute">{p.brand}</div>
                </div>
                <Status tone={p.stock <= 5 ? "critical" : "warning"}>{p.stock} left</Status>
                <Button size="sm" variant="secondary" onClick={() => { patch(p.id, { stock: p.stock + 10 }); toast({ title: "Restocked +10", body: p.name, tone: "success" }); }}>
                  +10
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

/* ---------------------------------- Orders --------------------------------- */

export function PartsOrders() {
  const { id, orders } = useSeller();
  const advance = useDB((s) => s.advanceOrder);
  const [tab, setTab] = useState<"open" | "shipped" | "delivered" | "all">("open");
  const st = (o: Order) => o.fulfil[id];
  const list = orders.filter((o) => (tab === "all" ? true : tab === "open" ? st(o) === "placed" || st(o) === "packed" : st(o) === tab));
  const n = (f: (o: Order) => boolean) => orders.filter(f).length;

  return (
    <>
      <PageHead title="Orders" sub="Pack, ship and confirm delivery." />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "open", label: "To fulfil", count: n((o) => st(o) === "placed" || st(o) === "packed") },
          { value: "shipped", label: "In transit", count: n((o) => st(o) === "shipped") },
          { value: "delivered", label: "Delivered", count: n((o) => st(o) === "delivered") },
          { value: "all", label: "All", count: orders.length },
        ]}
      />
      {list.length === 0 ? (
        <Panel><Empty icon={Inbox} title="No orders here" /></Panel>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {list.map((o) => {
              const s = st(o);
              const step = ORDER_FLOW.indexOf(s);
              return (
                <motion.div key={o.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Panel pad={false}>
                    <div className="flex flex-wrap items-center gap-3 border-b border-hair px-5 py-4 sm:px-6">
                      <Avatar name={o.customer.name} hue={o.customer.name.length * 31} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-semibold tracking-tight">{o.id}</div>
                        <div className="truncate text-[12px] text-mute">{o.customer.name} · {o.address}, {o.state} · {timeAgo(o.at)}</div>
                      </div>
                      <Status tone={ORDER_TONE[s].tone}>{ORDER_TONE[s].label}</Status>
                    </div>
                    <div className="grid gap-5 px-5 py-4 sm:px-6 md:grid-cols-[1fr_auto] md:items-center">
                      <ul className="space-y-1.5">
                        {myLines(o, id).map((l) => (
                          <li key={l.partId} className="flex justify-between gap-4 text-[14px]">
                            <span className="truncate"><span className="text-mute tabular-nums">{l.qty}×</span> {l.name}</span>
                            <span className="tabular-nums">{naira(l.price * l.qty)}</span>
                          </li>
                        ))}
                        <li className="flex justify-between border-t border-hair pt-1.5 text-[14px] font-semibold">
                          <span>Your share</span>
                          <span className="tabular-nums">{naira(myTotal(o, id))}</span>
                        </li>
                      </ul>
                      <div className="flex flex-col items-stretch gap-3 md:w-72">
                        <Stepper step={step} />
                        {NEXT_LABEL[s] && (
                          <Button
                            size="sm"
                            variant={s === "shipped" ? "brand" : "primary"}
                            onClick={() => {
                              advance(o.id, id);
                              toast({ title: ORDER_TONE[ORDER_FLOW[step + 1]].label, body: `${o.id} · ${o.customer.name} has been notified.`, tone: "success" });
                            }}
                          >
                            {s === "packed" && <Truck className="h-4 w-4" />}
                            {NEXT_LABEL[s]}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Panel>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}

/** Four-step order progress. Shared with the customer view. */
export function Stepper({ step }: { step: number }) {
  const labels = ["Placed", "Packed", "Shipped", "Delivered"];
  return (
    <div>
      <div className="flex items-center gap-1">
        {labels.map((_, i) => (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-hair">
            <motion.div className="h-full rounded-full bg-brand" initial={false} animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.5, delay: i * 0.06 }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-4 text-[11px] text-faint">
        {labels.map((l, i) => (
          <span key={l} className={cn(i === step && "font-semibold text-ink", i === 3 && "text-right", (i === 1 || i === 2) && "text-center")}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- Products -------------------------------- */

export function PartsProducts() {
  const { id, products } = useSeller();
  const patch = useDB((s) => s.patchPart);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const list = products.filter((p) => (p.name + p.brand).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHead title="Products" sub="Prices and stock update on the Parts store instantly." action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add product</Button>} />
      <div className="mb-4">
        <Input placeholder="Search your catalogue" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      </div>
      <Panel pad={false}>
        {list.length === 0 ? (
          <Empty icon={Package} title="No products" action={<Button onClick={() => setAdding(true)}>Add product</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-hair">
                  <th className={th}>Product</th>
                  <th className={th}>Price</th>
                  <th className={th}>Stock</th>
                  <th className={th}>Status</th>
                  <th className={cn(th, "text-right")}>Listed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hair">
                {list.map((p) => (
                  <tr key={p.id} className={cn("transition hover:bg-mist/40", !p.active && "opacity-60")}>
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <PartVisual category={p.category} className="h-11 w-11 shrink-0 rounded-xl" small />
                        <div className="min-w-0">
                          <div className="max-w-[260px] truncate font-medium">{p.name}</div>
                          <div className="text-[12px] text-mute">{p.brand} · {p.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className={td}>
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-mute">₦</span>
                        <input
                          key={p.price}
                          defaultValue={p.price.toLocaleString("en-NG")}
                          onBlur={(e) => {
                            const n = Number(e.target.value.replace(/\D/g, ""));
                            if (n > 0 && n !== p.price) {
                              patch(p.id, { price: n });
                              toast({ title: "Price updated", body: `${p.name}: ${naira(n)}`, tone: "success" });
                            }
                          }}
                          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                          aria-label={`Price for ${p.name}`}
                          className="h-9 w-full rounded-lg border border-line pl-6 pr-2 text-right text-[14px] font-semibold tabular-nums outline-none focus:border-link"
                        />
                      </div>
                    </td>
                    <td className={td}>
                      <div className="inline-flex items-center rounded-full bg-mist p-0.5">
                        <button onClick={() => patch(p.id, { stock: Math.max(0, p.stock - 1) })} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white" aria-label="Decrease stock"><Minus className="h-3.5 w-3.5" /></button>
                        <span className={cn("w-10 text-center text-[14px] font-semibold tabular-nums", p.stock <= 5 && "text-[#b3261e]")}>{p.stock}</span>
                        <button onClick={() => patch(p.id, { stock: p.stock + 1 })} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white" aria-label="Increase stock"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                    <td className={td}>
                      {p.stock === 0 ? <Status tone="critical">Out of stock</Status> : p.stock <= 10 ? <Status tone="warning">Low stock</Status> : <Status tone="good">In stock</Status>}
                    </td>
                    <td className={cn(td, "text-right")}>
                      <div className="inline-flex"><Toggle checked={p.active} onChange={(v) => patch(p.id, { active: v })} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <AddProduct open={adding} onClose={() => setAdding(false)} sellerId={id} />
    </>
  );
}

function AddProduct({ open, onClose, sellerId }: { open: boolean; onClose: () => void; sellerId: string }) {
  const add = useDB((s) => s.addPart);
  const biz = useBusiness(sellerId);
  const blank = { name: "", brand: "", category: "Engine" as PartCategory, price: "", stock: "10", fitsText: "", genuine: true };
  const [f, setF] = useState(blank);
  const valid = f.name.trim() && f.brand.trim() && Number(f.price) > 0;
  return (
    <Sheet open={open} onClose={onClose} title="Add a product">
      <div className="space-y-4 pb-2">
        <Field label="Product name">
          <Input placeholder="e.g. Front Brake Pads" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand">
            <Input placeholder="e.g. Bosch" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} />
          </Field>
          <Field label="Category">
            <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as PartCategory })}>
              {PART_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Price (₦)">
            <Input inputMode="numeric" value={f.price ? Number(f.price).toLocaleString() : ""} onChange={(e) => setF({ ...f, price: e.target.value.replace(/\D/g, "") })} />
          </Field>
          <Field label="Stock">
            <Input inputMode="numeric" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value.replace(/\D/g, "") })} />
          </Field>
        </div>
        <Field label="Fits" hint="Models and years this part fits">
          <Input placeholder="e.g. Toyota Corolla 2014–2019" value={f.fitsText} onChange={(e) => setF({ ...f, fitsText: e.target.value })} />
        </Field>
        <Toggle checked={f.genuine} onChange={(v) => setF({ ...f, genuine: v })} label="Genuine / OEM part" />
        <Button
          size="lg"
          className="w-full"
          disabled={!valid}
          onClick={() => {
            const make = f.fitsText.split(" ")[0];
            add({
              id: `p-${Date.now().toString(36)}`, name: f.name.trim(), brand: f.brand.trim(), category: f.category, price: Number(f.price), rating: 5, reviews: 0,
              fits: make ? [make] : ["Universal"], fitsText: f.fitsText || "Universal", stock: Number(f.stock) || 0, genuine: f.genuine,
              seller: biz?.name ?? "Seller", sellerId, location: biz ? `${biz.city}, ${biz.state}` : "Lagos",
            });
            toast({ title: "Product added", body: "It's live on the Parts store.", tone: "success" });
            setF(blank);
            onClose();
          }}
        >
          Publish product
        </Button>
      </div>
    </Sheet>
  );
}

/* --------------------------------- Requests -------------------------------- */

export function PartsRequests() {
  const { id } = useSeller();
  const requests = useDB((s) => s.requests);
  const [tab, setTab] = useState<"open" | "quoted">("open");
  const open = requests.filter((r) => r.status === "open" && !r.quotes.some((q) => q.businessId === id)).sort((a, b) => b.at - a.at);
  const quoted = requests.filter((r) => r.quotes.some((q) => q.businessId === id)).sort((a, b) => b.at - a.at);
  const list = tab === "open" ? open : quoted;
  return (
    <>
      <PageHead title="Part requests" sub="Buyers describe what they need. Send a quote and win the sale." />
      <Tabs value={tab} onChange={setTab} items={[{ value: "open", label: "Open", count: open.length }, { value: "quoted", label: "You quoted", count: quoted.length }]} />
      {list.length === 0 ? (
        <Panel><Empty icon={ClipboardList} title={tab === "open" ? "No new requests" : "You haven't quoted yet"} body="New requests from buyers nationwide appear here." /></Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((r) => <RequestCard key={r.id} r={r} me={id} />)}
        </div>
      )}
    </>
  );
}

function RequestCard({ r, me }: { r: PartRequest; me: string }) {
  const quote = useDB((s) => s.quote);
  const send = useDB((s) => s.send);
  const mine = r.quotes.find((q) => q.businessId === me);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  return (
    <Panel>
      <div className="flex items-start gap-3">
        <Avatar name={r.customer.name} hue={r.customer.name.length * 31} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold tracking-tight">{r.part}</div>
          <div className="text-[13px] text-mute">{r.vehicle} · {r.state} · {timeAgo(r.at)}</div>
        </div>
        <span className="text-[12px] text-faint">{r.quotes.length} {r.quotes.length === 1 ? "quote" : "quotes"}</span>
      </div>
      {r.note && <p className="mt-3 rounded-xl bg-mist px-3.5 py-2.5 text-[14px] text-ink-2">“{r.note}”</p>}
      {mine ? (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-hair px-4 py-3">
          <div>
            <div className="text-[12px] text-faint">Your quote</div>
            <div className="text-[16px] font-semibold tabular-nums">{naira(mine.price)}</div>
          </div>
          <Status tone={r.status === "closed" ? "neutral" : "info"}>{r.status === "closed" ? "Request closed" : "Sent"}</Status>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <div className="relative w-40 shrink-0">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-mute">₦</span>
              <Input inputMode="numeric" placeholder="Price" className="pl-8" value={price ? Number(price).toLocaleString() : ""} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} />
            </div>
            <Input placeholder="Brand, condition, delivery time" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button
            className="w-full"
            disabled={!Number(price)}
            onClick={() => {
              if (paused("partRequests")) return;
              const p = Number(price);
              quote(r.id, { businessId: me, price: p, note: note.trim() });
              send({ businessId: me, customer: r.customer, topic: { kind: "request", id: r.id, title: r.part }, from: "business", text: `Quote for your ${r.part} (${r.vehicle}): ${naira(p)}.${note.trim() ? " " + note.trim() : ""}` });
              toast({ title: "Quote sent", body: `${r.customer.name} will see it in their dashboard.`, tone: "success" });
            }}
          >
            <Send className="h-4 w-4" /> Send quote
          </Button>
        </div>
      )}
    </Panel>
  );
}

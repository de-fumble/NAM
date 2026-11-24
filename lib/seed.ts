/** Demo marketplace activity — used for local mode and to seed Supabase. Pure (no browser APIs). */
import { DEMO_ACCOUNTS } from "./data/businesses";
import { PARTS } from "./data/parts";
import { RENTALS } from "./data/rentals";
import type { Booking, BookingStatus, Inspection, Lead, Message, Order, OrderLine, OrderStatus, PartRequest, Person, Thread } from "./db";

/* ---------------------------------- Seed ---------------------------------- */

export function buildSeed(now: number) {
  const H = 3_600_000;
  const D = 24 * H;
  const me = DEMO_ACCOUNTS[0];
  const P = (name: string, phone: string): Person => ({ name, phone });
  const adaeze = P(me.name, me.phone);
  const bolaji = P("Bolaji Ogunleye", "+234 806 210 4433");
  const hauwa = P("Hauwa Musa", "+234 703 118 9020");
  const kelechi = P("Kelechi Uba", "+234 812 640 7781");
  const tolu = P("Tolu Adebayo", "+234 805 993 1200");
  const ifeoma = P("Ifeoma Nnaji", "+234 809 450 6677");
  const iso = (offsetDays: number) => new Date(now + offsetDays * D).toISOString().slice(0, 10);
  const part = (id: string) => PARTS.find((p) => p.id === id)!;
  const line = (id: string, qty: number): OrderLine => {
    const p = part(id);
    return { partId: id, name: p.name, qty, price: p.price, sellerId: p.sellerId };
  };
  const order = (id: string, customer: Person, lines: OrderLine[], ago: number, status: OrderStatus, state = "Lagos"): Order => {
    const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
    const delivery = subtotal >= 150_000 ? 0 : 3_500;
    const vat = Math.round(subtotal * 0.075);
    return {
      id, customer, address: "Lekki Phase 1, Lagos", state, pay: "card", lines, subtotal, delivery, vat, total: subtotal + delivery + vat,
      fulfil: Object.fromEntries(Array.from(new Set(lines.map((l) => l.sellerId))).map((s) => [s, status])), at: now - ago,
    };
  };
  const rental = (id: string) => RENTALS.find((r) => r.id === id)!;
  const booking = (id: string, rid: string, customer: Person, start: number, days: number, status: BookingStatus, ago: number): Booking => {
    const r = rental(rid);
    return { id, rentalId: rid, companyId: r.companyId, vehicle: r.name, customer, city: r.cities[0], from: iso(start), to: iso(start + days), days, driver: true, total: r.daily * days, status, at: now - ago };
  };
  const msgs = (pairs: [Message["from"], string, number][]): Message[] => pairs.map(([from, text, ago]) => ({ from, text, at: now - ago }));

  const leads: Lead[] = [
    { id: "lead-1", carId: "toyota-camry-xse-2020", businessId: "prestige", customer: adaeze, kind: "offer", amount: 30_500_000, note: "Can pay today if we agree.", stage: "negotiating", at: now - 2 * H },
    { id: "lead-2", carId: "bmw-740li-2021", businessId: "prestige", customer: bolaji, kind: "message", note: "Is it still available? Interested in viewing Saturday.", stage: "new", at: now - 0.4 * H },
    { id: "lead-3", carId: "tesla-model-y-2025", businessId: "prestige", customer: hauwa, kind: "inspection", note: "Booked Complete inspection, Thu 10:00", stage: "viewing", at: now - 1 * D },
    { id: "lead-4", carId: "porsche-panamera-4s-2019", businessId: "prestige", customer: kelechi, kind: "message", note: "Any service history?", stage: "contacted", at: now - 3 * D },
    { id: "lead-5", carId: "mercedes-cls-450-2020", businessId: "prestige", customer: tolu, kind: "offer", amount: 76_000_000, note: "Final offer.", stage: "won", at: now - 6 * D },
    { id: "lead-6", carId: "audi-a7-sportback-2019", businessId: "prestige", customer: ifeoma, kind: "offer", amount: 44_000_000, note: "", stage: "lost", at: now - 9 * D },
    { id: "lead-7", carId: "range-rover-sport-hse-2019", businessId: "abuja-hub", customer: adaeze, kind: "message", note: "Do you deliver to Lagos?", stage: "contacted", at: now - 2 * D },
  ];

  const threads: Thread[] = [
    {
      id: "t-1", businessId: "prestige", customer: adaeze, topic: { kind: "car", id: "toyota-camry-xse-2020", title: "2020 Toyota Camry XSE" }, unreadBiz: 1, unreadCust: 0, at: now - 2 * H,
      messages: msgs([["customer", "Good afternoon, is the Camry still available?", 26 * H], ["business", "Yes it is! Would you like to come and see it at our Lekki showroom?", 25.5 * H], ["customer", "I've sent an offer of ₦30.5M through the app. Can we close at that?", 2 * H]]),
    },
    {
      id: "t-2", businessId: "prestige", customer: bolaji, topic: { kind: "car", id: "bmw-740li-2021", title: "2021 BMW 7 Series" }, unreadBiz: 1, unreadCust: 0, at: now - 0.4 * H,
      messages: msgs([["customer", "Is it still available? Interested in viewing Saturday.", 0.4 * H]]),
    },
    {
      id: "t-3", businessId: "ladipo-genuine-parts", customer: adaeze, topic: { kind: "part", id: "brake-pads-camry", title: "Ceramic Front Brake Pads" }, unreadBiz: 0, unreadCust: 1, at: now - 5 * H,
      messages: msgs([["customer", "Will these fit a 2016 Camry SE?", 7 * H], ["business", "Yes ma, they fit 2012–2017 Camry. Your order ships today.", 5 * H]]),
    },
    {
      id: "t-4", businessId: "lagos-luxe", customer: adaeze, topic: { kind: "rental", id: "r-camry", title: "Toyota Camry 2020 rental" }, unreadBiz: 0, unreadCust: 0, at: now - 20 * H,
      messages: msgs([["customer", "Can the driver pick me up at MM2 airport?", 22 * H], ["business", "Absolutely. Share your flight number and he'll be waiting at arrivals.", 20 * H]]),
    },
    {
      id: "t-5", businessId: "lagos-luxe", customer: bolaji, topic: { kind: "rental", id: "r-wraith", title: "Rolls-Royce Wraith rental" }, unreadBiz: 1, unreadCust: 0, at: now - 3 * H,
      messages: msgs([["customer", "Do you decorate the car for weddings? Ceremony is at Eko Hotel.", 3 * H]]),
    },
  ];

  const orders: Order[] = [
    order("NAM-482190", adaeze, [line("brake-pads-camry", 1), line("oil-filter", 2)], 26 * H, "shipped"),
    order("NAM-559301", kelechi, [line("spark-plugs-iridium", 1)], 0.5 * H, "placed", "Rivers"),
    order("NAM-610877", tolu, [line("atf-ws", 2), line("oil-filter", 1)], 5 * H, "packed"),
    order("NAM-377204", hauwa, [line("engine-mount", 2)], 4 * D, "delivered", "FCT Abuja"),
    order("NAM-702415", bolaji, [line("side-mirror", 1), line("cabin-filter", 1)], 2 * H, "placed"),
    order("NAM-298841", ifeoma, [line("brake-pads-camry", 2)], 9 * D, "delivered"),
  ];

  const bookings: Booking[] = [
    booking("RB-30211", "r-camry", adaeze, 2, 3, "confirmed", 20 * H),
    booking("RB-30544", "r-wraith", bolaji, 9, 1, "pending", 3 * H),
    booking("RB-29980", "r-bmw7", ifeoma, -1, 3, "active", 4 * D),
    booking("RB-30602", "r-gle", kelechi, 4, 2, "pending", 1 * H),
    booking("RB-28710", "r-expedition", tolu, -8, 4, "completed", 12 * D),
    booking("RB-28455", "r-camry", hauwa, -15, 2, "completed", 18 * D),
  ];

  const requests: PartRequest[] = [
    { id: "rq-1", customer: adaeze, part: "Front shock absorbers (pair)", vehicle: "Lexus RX 350 2016", state: "Lagos", note: "Genuine or KYB please.", status: "open", at: now - 6 * H, quotes: [{ businessId: "autopro-ikeja", price: 138_000, note: "KYB Excel-G, in stock. Fitting available.", at: now - 4 * H }] },
    { id: "rq-2", customer: kelechi, part: "Automatic gearbox assembly", vehicle: "Toyota Sienna 2011", state: "Rivers", note: "Tokunbo is fine, must be tested.", status: "open", at: now - 1.5 * H, quotes: [] },
    { id: "rq-3", customer: hauwa, part: "Headlight assembly (left)", vehicle: "Honda Accord 2018", state: "FCT Abuja", note: "", status: "open", at: now - 1 * D, quotes: [{ businessId: "nnewi-motor-spares", price: 165_000, note: "OEM Depo, ships tomorrow.", at: now - 20 * H }] },
    { id: "rq-4", customer: tolu, part: "AC compressor", vehicle: "Toyota Corolla 2014", state: "Lagos", note: "Need it this week.", status: "open", at: now - 30 * 60_000, quotes: [] },
  ];

  const inspections: Inspection[] = [
    { id: "ins-1", carId: "tesla-model-y-2025", businessId: "prestige", customer: hauwa, date: iso(1), slot: "10:00", plan: "Complete", price: 63_000, at: now - 1 * D },
  ];

  return { leads, threads, orders, bookings, requests, inspections };
}

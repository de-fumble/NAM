import { CARS, SELLERS } from "./cars";
import { IMG } from "./images";
import { PARTS } from "./parts";

export type Role = "customer" | "dealer" | "rental" | "parts";
export type BizType = Exclude<Role, "customer">;

export interface Business {
  id: string;
  name: string;
  type: BizType;
  tagline: string;
  about: string;
  city: string;
  state: string;
  phone: string;
  rating: number;
  reviews: number;
  since: number;
  responseMins: number;
  verified: boolean;
  cover: string;
  hue: number;
  /** Set by admins. Suspended businesses are hidden from shoppers. */
  status?: "active" | "suspended";
}

export const ROLE_META: Record<Role, { label: string; short: string; blurb: string }> = {
  customer: { label: "Customer", short: "Buyer", blurb: "Buy cars, order parts, rent and hire pros." },
  dealer: { label: "Car dealer", short: "Dealer", blurb: "List inventory, manage leads and close sales." },
  rental: { label: "Rental company", short: "Rentals", blurb: "Manage your fleet, bookings and chauffeurs." },
  parts: { label: "Parts dealer", short: "Parts", blurb: "Sell parts, fulfil orders and quote on requests." },
};

const dealers: Business[] = SELLERS.filter((s) => s.type === "Dealer").map((s, i) => ({
  id: s.id,
  name: s.name,
  type: "dealer",
  tagline: "Verified car dealer",
  about: `${s.name} has sold quality brand-new and tokunbo vehicles from ${s.city}, ${s.state} since ${s.since}. Every car is inspected, duty-verified and available for viewing six days a week.`,
  city: s.city,
  state: s.state,
  phone: s.phone,
  rating: s.rating,
  reviews: s.reviews,
  since: s.since,
  responseMins: s.responseMins,
  verified: s.verified,
  cover: CARS.find((c) => c.sellerId === s.id)?.img ?? IMG.clsDark,
  hue: (i * 47 + 140) % 360,
}));

const rentals: Business[] = [
  {
    id: "lagos-luxe", name: "Lagos Luxe Rentals", type: "rental", tagline: "Executive & event car hire",
    about: "Chauffeur-driven executive cars, airport transfers and wedding fleets across Lagos and Abuja. Uniformed, police-cleared drivers and 24/7 support.",
    city: "Victoria Island", state: "Lagos", phone: "+234 802 410 7788", rating: 4.9, reviews: 812, since: 2015, responseMins: 5, verified: true, cover: IMG.bmw7, hue: 265,
  },
  {
    id: "capital-chauffeurs", name: "Capital Chauffeurs", type: "rental", tagline: "Abuja's executive fleet",
    about: "Diplomatic-grade SUVs and saloons for embassies, corporates and visiting executives in the FCT.",
    city: "Wuse II", state: "FCT Abuja", phone: "+234 809 331 2040", rating: 4.8, reviews: 377, since: 2017, responseMins: 9, verified: true, cover: IMG.rangeRover, hue: 210,
  },
  {
    id: "garden-city-hire", name: "Garden City Car Hire", type: "rental", tagline: "Self-drive & events",
    about: "Self-drive and chauffeured hire for Port Harcourt and Lagos, from daily runabouts to photo-shoot muscle cars.",
    city: "GRA Phase 2", state: "Rivers", phone: "+234 805 118 6600", rating: 4.7, reviews: 214, since: 2019, responseMins: 14, verified: true, cover: IMG.mustangGrey, hue: 20,
  },
];

const partsSellers: Business[] = Array.from(new Map(PARTS.map((p) => [p.sellerId, p])).values()).map((p, i) => {
  const [city, state] = p.location.split(", ");
  return {
    id: p.sellerId,
    name: p.seller,
    type: "parts",
    tagline: "Verified parts dealer",
    about: `${p.seller} supplies genuine and OEM-grade parts from ${p.location}, with nationwide delivery and a 7-day fit guarantee.`,
    city,
    state,
    phone: `+234 80${3 + (i % 6)} ${String(400 + i * 37).padStart(3, "0")} ${String(1000 + i * 731).slice(0, 4)}`,
    rating: +(4.5 + ((i * 7) % 5) / 10).toFixed(1),
    reviews: 120 + i * 83,
    since: 2010 + (i % 9),
    responseMins: 6 + i * 2,
    verified: true,
    cover: [IMG.engine, IMG.workshop, IMG.engineBay, IMG.oilChange][i % 4],
    hue: (i * 61 + 30) % 360,
  } satisfies Business;
});

export const BUSINESSES: Business[] = [...dealers, ...rentals, ...partsSellers];

export const DEMO_ACCOUNTS: { role: Role; name: string; phone: string; businessId?: string }[] = [
  { role: "customer", name: "Adaeze Okonkwo", phone: "+234 803 555 0101" },
  { role: "dealer", name: "Prestige Autos Lekki", phone: SELLERS[0].phone, businessId: "prestige" },
  { role: "rental", name: "Lagos Luxe Rentals", phone: "+234 802 410 7788", businessId: "lagos-luxe" },
  { role: "parts", name: "Ladipo Genuine Parts", phone: "+234 803 400 1000", businessId: "ladipo-genuine-parts" },
];

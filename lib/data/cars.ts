import { IMG } from "./images";

export type Condition = "Brand New" | "Foreign Used" | "Nigerian Used";
export type Body = "Sedan" | "SUV" | "Coupe" | "Hatchback" | "Pickup" | "Convertible" | "Motorbike";
export type Fuel = "Petrol" | "Diesel" | "Electric" | "Hybrid";

export interface Seller {
  id: string;
  name: string;
  type: "Dealer" | "Individual";
  city: string;
  state: string;
  rating: number;
  reviews: number;
  since: number;
  responseMins: number;
  verified: boolean;
  listings: number;
  phone: string;
}

export interface Car {
  id: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  price: number;
  condition: Condition;
  body: Body;
  fuel: Fuel;
  transmission: "Automatic" | "Manual";
  mileage: number;
  state: string;
  city: string;
  color: string;
  engine: string;
  img: string;
  sellerId: string;
  verified: boolean;
  inspected: boolean;
  dutyPaid: boolean;
  negotiable: boolean;
  featured?: boolean;
  postedDays: number;
  views: number;
  features: string[];
  /** Extra photo URLs (user-uploaded listings). */
  photos?: string[];
  description?: string;
  sellerName?: string;
  /** 17-character VIN the seller entered (user listings). */
  vin?: string;
  /** Set by the server: the VIN decoded (auto.dev) to the same make and year as the listing. */
  vinMatch?: boolean;
}

export const STATES = [
  "Lagos", "FCT Abuja", "Rivers", "Oyo", "Enugu", "Kano", "Delta", "Anambra", "Ogun", "Edo", "Kaduna", "Akwa Ibom",
] as const;

export const SELLERS: Seller[] = [
  { id: "prestige", name: "Prestige Autos Lekki", type: "Dealer", city: "Lekki", state: "Lagos", rating: 4.9, reviews: 612, since: 2014, responseMins: 6, verified: true, listings: 214, phone: "+234 801 234 5678" },
  { id: "abuja-hub", name: "Abuja Motor Hub", type: "Dealer", city: "Wuse II", state: "FCT Abuja", rating: 4.8, reviews: 438, since: 2016, responseMins: 11, verified: true, listings: 167, phone: "+234 803 555 0192" },
  { id: "garden-city", name: "Garden City Car Mart", type: "Dealer", city: "GRA Phase 2", state: "Rivers", rating: 4.7, reviews: 290, since: 2017, responseMins: 18, verified: true, listings: 98, phone: "+234 805 777 3344" },
  { id: "ikeja-motors", name: "Ikeja Motors", type: "Dealer", city: "Ikeja", state: "Lagos", rating: 4.6, reviews: 351, since: 2012, responseMins: 9, verified: true, listings: 143, phone: "+234 809 120 4455" },
  { id: "tokunbo-kings", name: "Tokunbo Kings", type: "Dealer", city: "Berger", state: "Lagos", rating: 4.8, reviews: 702, since: 2011, responseMins: 4, verified: true, listings: 389, phone: "+234 812 900 1122" },
  { id: "coal-city", name: "Coal City Autos", type: "Dealer", city: "Independence Layout", state: "Enugu", rating: 4.7, reviews: 188, since: 2018, responseMins: 15, verified: true, listings: 76, phone: "+234 806 410 2020" },
  { id: "chinedu", name: "Chinedu Okafor", type: "Individual", city: "Yaba", state: "Lagos", rating: 4.9, reviews: 14, since: 2021, responseMins: 22, verified: true, listings: 2, phone: "+234 817 222 9090" },
  { id: "aisha", name: "Aisha Bello", type: "Individual", city: "Maitama", state: "FCT Abuja", rating: 5.0, reviews: 7, since: 2022, responseMins: 35, verified: true, listings: 1, phone: "+234 703 615 4411" },
  { id: "tunde", name: "Tunde Adeyemi", type: "Individual", city: "Bodija", state: "Oyo", rating: 4.6, reviews: 9, since: 2020, responseMins: 40, verified: false, listings: 1, phone: "+234 708 333 7788" },
];

const F = {
  base: ["Air conditioning", "Bluetooth", "Reverse camera", "Keyless entry", "Push start"],
  lux: ["Leather seats", "Panoramic roof", "Heated & ventilated seats", "360° camera", "Premium audio", "Adaptive cruise control"],
  suv: ["All-wheel drive", "Third-row seating", "Roof rails", "Hill descent control"],
  sport: ["Launch control", "Sport exhaust", "Carbon ceramic brakes", "Adaptive suspension"],
  ev: ["Autopilot", "Over-the-air updates", "Fast charging", "Glass roof"],
};

type Row = [
  id: string, make: string, model: string, trim: string, year: number, price: number, condition: Condition, body: Body,
  fuel: Fuel, mileage: number, state: string, city: string, color: string, engine: string, img: string, seller: string,
  flags: string, features: string[],
];

// flags: v=verified i=inspected d=duty paid n=negotiable f=featured m=manual
const rows: Row[] = [
  ["toyota-camry-xse-2020", "Toyota", "Camry", "XSE", 2020, 32_500_000, "Foreign Used", "Sedan", "Petrol", 41_200, "Lagos", "Lekki", "Celestial Silver", "2.5L 4-cyl", IMG.camry, "prestige", "vidnf", [...F.base, "Lane keep assist", "Sport-tuned suspension"]],
  ["toyota-rav4-xle-2019", "Toyota", "RAV4", "XLE", 2019, 29_000_000, "Foreign Used", "SUV", "Petrol", 58_900, "FCT Abuja", "Wuse II", "Silver Sky", "2.5L 4-cyl", IMG.rav4, "abuja-hub", "vidnf", [...F.base, ...F.suv.slice(0, 2), "Apple CarPlay"]],
  ["toyota-tacoma-trd-2019", "Toyota", "Tacoma", "TRD Off-Road", 2019, 38_000_000, "Foreign Used", "Pickup", "Petrol", 63_400, "Rivers", "GRA Phase 2", "Quicksand", "3.5L V6", IMG.tacoma, "garden-city", "vidn", [...F.base, "4x4", "Crawl control", "Locking rear diff"]],
  ["hyundai-accent-2019", "Hyundai", "Accent", "GLS", 2019, 11_800_000, "Nigerian Used", "Sedan", "Petrol", 88_000, "Lagos", "Ikeja", "Phantom Black", "1.6L 4-cyl", IMG.hyundaiAccent, "ikeja-motors", "vdn", [...F.base.slice(0, 3)]],
  ["mercedes-cls-450-2020", "Mercedes-Benz", "CLS", "450 4MATIC", 2020, 78_000_000, "Foreign Used", "Sedan", "Petrol", 29_800, "Lagos", "Victoria Island", "Obsidian Black", "3.0L I6 EQ Boost", IMG.clsDark, "prestige", "vidf", [...F.base, ...F.lux]],
  ["range-rover-sport-hse-2019", "Land Rover", "Range Rover Sport", "HSE Dynamic", 2019, 110_000_000, "Foreign Used", "SUV", "Petrol", 37_500, "FCT Abuja", "Maitama", "Santorini Black", "3.0L V6 Supercharged", IMG.rangeRover, "abuja-hub", "vidnf", [...F.base, ...F.lux, ...F.suv.slice(0, 1), "Terrain Response 2"]],
  ["mercedes-gle-43-coupe-2019", "Mercedes-Benz", "GLE", "43 AMG Coupé", 2019, 98_000_000, "Foreign Used", "SUV", "Petrol", 33_100, "Lagos", "Ikoyi", "Polar White", "3.0L V6 Biturbo", IMG.gleCoupe, "tokunbo-kings", "vidnf", [...F.base, ...F.lux, "AMG Ride Control"]],
  ["ford-expedition-limited-2019", "Ford", "Expedition", "Limited", 2019, 68_000_000, "Foreign Used", "SUV", "Petrol", 51_000, "Lagos", "Berger", "Oxford White", "3.5L EcoBoost V6", IMG.expedition, "tokunbo-kings", "vidn", [...F.base, ...F.suv, "Power running boards"]],
  ["bmw-740li-2021", "BMW", "7 Series", "740Li xDrive", 2021, 115_000_000, "Foreign Used", "Sedan", "Petrol", 18_700, "Lagos", "Victoria Island", "Bernina Grey", "3.0L I6 TwinPower", IMG.bmw7, "prestige", "vidf", [...F.base, ...F.lux, "Executive lounge seating", "Gesture control"]],
  ["tesla-model-y-2025", "Tesla", "Model Y", "Long Range AWD", 2025, 72_000_000, "Brand New", "SUV", "Electric", 0, "Lagos", "Lekki", "Pearl White", "Dual Motor · 533 km range", IMG.modelY, "prestige", "vidf", [...F.ev, ...F.base.slice(0, 2)]],
  ["audi-q5-premium-2020", "Audi", "Q5", "45 TFSI quattro", 2020, 42_000_000, "Foreign Used", "SUV", "Petrol", 39_000, "FCT Abuja", "Garki", "Glacier White", "2.0L TFSI", IMG.audiQ5, "abuja-hub", "vidn", [...F.base, ...F.lux.slice(0, 3), "Virtual cockpit"]],
  ["audi-q3-sline-2019", "Audi", "Q3", "S line", 2019, 27_000_000, "Foreign Used", "SUV", "Petrol", 47_600, "Enugu", "Independence Layout", "Mythos Black", "2.0L TFSI", IMG.audiQ3, "coal-city", "vdn", [...F.base, "Virtual cockpit"]],
  ["audi-a7-sportback-2019", "Audi", "A7", "Sportback 55 TFSI", 2019, 55_000_000, "Foreign Used", "Sedan", "Petrol", 35_200, "Lagos", "Ikoyi", "Florett Silver", "3.0L V6 TFSI", IMG.audiA7, "prestige", "vidn", [...F.base, ...F.lux.slice(0, 4)]],
  ["bmw-m4-competition-2019", "BMW", "M4", "Competition", 2019, 95_000_000, "Foreign Used", "Coupe", "Petrol", 22_300, "Lagos", "Lekki", "Grigio Telesto", "3.0L I6 Twin-Turbo", IMG.bmwM4, "tokunbo-kings", "vidn", [...F.base, ...F.sport.slice(0, 2), "M Carbon seats"]],
  ["bmw-m5-2020", "BMW", "M5", "Competition", 2020, 120_000_000, "Foreign Used", "Sedan", "Petrol", 19_800, "FCT Abuja", "Asokoro", "Frozen Grey", "4.4L V8 Twin-Turbo", IMG.bmwM5, "abuja-hub", "vidf", [...F.base, ...F.lux.slice(0, 3), ...F.sport.slice(0, 2)]],
  ["bmw-430i-coupe-2018", "BMW", "4 Series", "430i Coupé", 2018, 36_000_000, "Nigerian Used", "Coupe", "Petrol", 61_000, "Lagos", "Yaba", "Estoril Blue", "2.0L TwinPower Turbo", IMG.bmw4Blue, "chinedu", "vdn", [...F.base, "M Sport package"]],
  ["mercedes-c63-amg-2018", "Mercedes-Benz", "C-Class", "C63 S AMG", 2018, 72_000_000, "Foreign Used", "Sedan", "Petrol", 30_900, "Rivers", "GRA Phase 2", "Selenite Grey", "4.0L V8 Biturbo", IMG.c63, "garden-city", "vidn", [...F.base, ...F.sport.slice(1, 3), "Burmester audio"]],
  ["ford-mustang-gt-2018", "Ford", "Mustang", "GT Premium", 2018, 45_000_000, "Foreign Used", "Coupe", "Petrol", 27_400, "Lagos", "Ikeja", "Magnetic Grey", "5.0L V8", IMG.mustangGrey, "ikeja-motors", "vidn", [...F.base, "Track apps", "Line-lock"]],
  ["ford-mustang-ecoboost-2016", "Ford", "Mustang", "EcoBoost", 2016, 22_000_000, "Nigerian Used", "Coupe", "Petrol", 94_000, "Oyo", "Bodija", "Shadow Black", "2.3L EcoBoost", IMG.mustangBlack, "tunde", "n", [...F.base.slice(0, 3)]],
  ["chevrolet-camaro-ss-2017", "Chevrolet", "Camaro", "2SS", 2017, 38_000_000, "Foreign Used", "Coupe", "Petrol", 44_100, "Delta", "Asaba", "Hyper Blue", "6.2L V8", IMG.camaroBlue, "tokunbo-kings", "vdn", [...F.base, "Head-up display"]],
  ["dodge-challenger-srt-2019", "Dodge", "Challenger", "SRT Hellcat", 2019, 62_000_000, "Foreign Used", "Coupe", "Petrol", 21_000, "Lagos", "Lekki", "Pitch Black", "6.2L Supercharged V8", IMG.challenger, "prestige", "vidn", [...F.base, ...F.sport.slice(0, 2)]],
  ["nissan-juke-sv-2019", "Nissan", "Juke", "SV", 2019, 14_500_000, "Foreign Used", "SUV", "Petrol", 52_700, "Lagos", "Berger", "Gun Metallic", "1.6L Turbo", IMG.juke, "tokunbo-kings", "vdn", [...F.base]],
  ["tesla-model-3-2021", "Tesla", "Model 3", "Long Range", 2021, 48_000_000, "Foreign Used", "Sedan", "Electric", 31_000, "FCT Abuja", "Maitama", "Pearl White", "Dual Motor · 568 km range", IMG.model3, "aisha", "vin", [...F.ev]],
  ["tesla-model-s-2019", "Tesla", "Model S", "Performance", 2019, 70_000_000, "Foreign Used", "Sedan", "Electric", 42_000, "Lagos", "Victoria Island", "Solid Black", "Dual Motor · 595 km range", IMG.modelS, "prestige", "vid", [...F.ev, "Ludicrous mode"]],
  ["volkswagen-golf-gti-2017", "Volkswagen", "Golf", "GTI", 2017, 17_500_000, "Foreign Used", "Hatchback", "Petrol", 59_300, "Lagos", "Ikeja", "Deep Black Pearl", "2.0L TSI", IMG.golf, "ikeja-motors", "vdn", [...F.base, "Plaid sport seats"]],
  ["volkswagen-polo-2018", "Volkswagen", "Polo", "Comfortline", 2018, 8_900_000, "Nigerian Used", "Hatchback", "Petrol", 102_000, "Ogun", "Abeokuta", "Reef Blue", "1.4L 4-cyl", IMG.polo, "ikeja-motors", "vnm", [...F.base.slice(0, 2)]],
  ["hyundai-i30-nline-2020", "Hyundai", "i30", "N Line", 2020, 16_500_000, "Foreign Used", "Hatchback", "Petrol", 36_800, "Enugu", "GRA", "Engine Red", "1.6L T-GDi", IMG.i30, "coal-city", "vidn", [...F.base, "Apple CarPlay"]],
  ["audi-a5-coupe-2017", "Audi", "A5", "Coupé S line", 2017, 28_000_000, "Nigerian Used", "Coupe", "Petrol", 71_500, "Rivers", "Old GRA", "Sunset Orange", "2.0L TFSI", IMG.audiA5, "garden-city", "vn", [...F.base, "Virtual cockpit"]],
  ["jaguar-f-type-2018", "Jaguar", "F-Type", "R-Dynamic", 2018, 58_000_000, "Foreign Used", "Coupe", "Petrol", 26_000, "Lagos", "Ikoyi", "Caldera Red", "3.0L V6 Supercharged", IMG.fType, "prestige", "vidn", [...F.base, "Active sports exhaust"]],
  ["porsche-panamera-4s-2019", "Porsche", "Panamera", "4S", 2019, 135_000_000, "Foreign Used", "Sedan", "Petrol", 24_600, "Lagos", "Victoria Island", "Jet Black", "2.9L V6 Twin-Turbo", IMG.panamera, "prestige", "vidf", [...F.base, ...F.lux.slice(0, 4), "Sport Chrono"]],
  ["porsche-911-carrera-2019", "Porsche", "911", "Carrera S", 2019, 165_000_000, "Foreign Used", "Coupe", "Petrol", 14_900, "FCT Abuja", "Asokoro", "Carrara White", "3.0L Flat-6 Twin-Turbo", IMG.porsche911, "abuja-hub", "vid", [...F.base, ...F.sport.slice(0, 3)]],
  ["audi-r8-v10-2020", "Audi", "R8", "V10 performance", 2020, 285_000_000, "Foreign Used", "Coupe", "Petrol", 9_800, "Lagos", "Ikoyi", "Daytona Grey", "5.2L V10", IMG.r8, "prestige", "vid", [...F.base, ...F.sport]],
  ["mercedes-amg-gt-r-2020", "Mercedes-Benz", "AMG GT", "R", 2020, 240_000_000, "Foreign Used", "Coupe", "Petrol", 8_200, "Lagos", "Lekki", "Designo Grey Magno", "4.0L V8 Biturbo", IMG.amgGtR, "tokunbo-kings", "vid", [...F.base, ...F.sport]],
  ["rolls-royce-wraith-2019", "Rolls-Royce", "Wraith", "Black Badge", 2019, 480_000_000, "Foreign Used", "Coupe", "Petrol", 11_300, "Lagos", "Ikoyi", "Arctic White / Black", "6.6L V12", IMG.wraith, "prestige", "vidf", [...F.base, ...F.lux, "Starlight headliner"]],
  ["lamborghini-huracan-evo-2021", "Lamborghini", "Huracán", "EVO", 2021, 520_000_000, "Foreign Used", "Coupe", "Petrol", 6_100, "Lagos", "Victoria Island", "Arancio Borealis", "5.2L V10", IMG.huracanOrange, "prestige", "vid", [...F.base, ...F.sport]],
  ["fiat-500-lounge-2017", "Fiat", "500", "Lounge", 2017, 7_500_000, "Nigerian Used", "Hatchback", "Petrol", 67_000, "Lagos", "Surulere", "Celeste Blue", "1.2L 4-cyl", IMG.fiat500, "ikeja-motors", "vn", [...F.base.slice(0, 2)]],
  ["volkswagen-beetle-1972", "Volkswagen", "Beetle", "Classic 1300", 1972, 9_500_000, "Nigerian Used", "Hatchback", "Petrol", 148_000, "Lagos", "Ikeja", "Marino Yellow", "1.3L Air-cooled Flat-4", IMG.beetleOrange, "chinedu", "vnm", ["Fully restored", "Original chrome", "New upholstery"]],
  ["chevrolet-camaro-zl1-2019", "Chevrolet", "Camaro", "ZL1", 2019, 68_000_000, "Foreign Used", "Coupe", "Petrol", 17_600, "Kano", "Nassarawa GRA", "Summit White", "6.2L Supercharged V8", IMG.camaroZl1, "abuja-hub", "vidn", [...F.base, ...F.sport.slice(0, 2)]],
  ["porsche-718-spyder-2021", "Porsche", "718", "Spyder", 2021, 150_000_000, "Foreign Used", "Convertible", "Petrol", 7_400, "Lagos", "Ikoyi", "Racing Yellow", "4.0L Flat-6", IMG.boxster, "prestige", "vid", [...F.base, ...F.sport.slice(0, 2)]],
  ["royal-enfield-classic-350-2024", "Royal Enfield", "Classic 350", "Signals", 2024, 4_800_000, "Brand New", "Motorbike", "Petrol", 0, "Lagos", "Ikeja", "Stormrider Sand", "349cc Single", IMG.bikeClassic, "ikeja-motors", "vdm", ["ABS", "USB charging", "Tripper navigation"]],
  ["yamaha-r6-2020", "Yamaha", "YZF-R6", "Race Blu", 2020, 9_800_000, "Foreign Used", "Motorbike", "Petrol", 8_900, "Lagos", "Lekki", "Yellow / Black", "599cc Inline-4", IMG.bikeSport, "tokunbo-kings", "vdnm", ["Quickshifter", "Traction control", "Slipper clutch"]],
  ["harley-livewire-2021", "Harley-Davidson", "LiveWire", "One", 2021, 22_000_000, "Foreign Used", "Motorbike", "Electric", 4_200, "FCT Abuja", "Wuse II", "Orange Fuse", "Electric · 235 km range", IMG.bikeElectric, "abuja-hub", "vid", ["Ride modes", "Fast charging", "TFT display"]],
];

export const CARS: Car[] = rows.map((r) => {
  const [id, make, model, trim, year, price, condition, body, fuel, mileage, state, city, color, engine, img, sellerId, flags, features] = r;
  return {
    id, make, model, trim, year, price, condition, body, fuel, mileage, state, city, color, engine, img, sellerId,
    transmission: flags.includes("m") ? "Manual" : "Automatic",
    verified: flags.includes("v"),
    inspected: flags.includes("i"),
    dutyPaid: flags.includes("d"),
    negotiable: flags.includes("n"),
    featured: flags.includes("f"),
    postedDays: (id.length * 7) % 19,
    views: 300 + ((id.length * 977) % 4800),
    features,
  };
});

export const MAKES = Array.from(new Set(CARS.map((c) => c.make))).sort();
export const BODIES: Body[] = ["Sedan", "SUV", "Coupe", "Hatchback", "Pickup", "Convertible", "Motorbike"];
export const CONDITIONS: Condition[] = ["Brand New", "Foreign Used", "Nigerian Used"];

export const getCar = (id: string) => CARS.find((c) => c.id === id);
let resolver: ((id: string) => Seller | undefined) | null = null;
/** Lets the client-side marketplace DB register sellers created at runtime (new dealers, private sellers). */
export const setSellerResolver = (fn: (id: string) => Seller | undefined) => {
  resolver = fn;
};
export const getSeller = (id: string): Seller =>
  SELLERS.find((s) => s.id === id) ??
  resolver?.(id) ?? {
    id, name: "Private seller", type: "Individual", city: "", state: "", rating: 5, reviews: 0, since: 2026, responseMins: 30, verified: false, listings: 1, phone: "",
  };
export const carTitle = (c: Car) => `${c.year} ${c.make} ${c.model}`;

export function carDescription(c: Car) {
  if (c.description) return c.description;
  const s = getSeller(c.sellerId);
  const cond =
    c.condition === "Brand New"
      ? "Brand new, zero mileage, full manufacturer warranty."
      : c.condition === "Foreign Used"
        ? `Foreign used (tokunbo), cleared with ${c.dutyPaid ? "verified customs duty papers" : "documents available on request"}.`
        : "Nigerian used, single owner, all service records available.";
  return `${cond} This ${c.year} ${c.make} ${c.model} ${c.trim} in ${c.color} is powered by the ${c.engine} and has covered ${c.mileage.toLocaleString()} km. ${
    c.inspected ? "It has passed our 150-point inspection with no structural damage, no flood history and a clean engine scan. " : ""
  }Available for viewing at ${s.name} in ${c.city}, ${c.state}. ${c.negotiable ? "Price is slightly negotiable for serious buyers." : "Price is fixed."}`;
}

export const BODY_TILES: { body: Body | "Electric" | "Luxury"; label: string; img: string; href: string }[] = [
  { body: "Sedan", label: "Sedans", img: IMG.camry, href: "/cars?body=Sedan" },
  { body: "SUV", label: "SUVs", img: IMG.rangeRover, href: "/cars?body=SUV" },
  { body: "Pickup", label: "Pickups", img: IMG.tacoma, href: "/cars?body=Pickup" },
  { body: "Coupe", label: "Coupés", img: IMG.bmwM4, href: "/cars?body=Coupe" },
  { body: "Electric", label: "Electric", img: IMG.model3White, href: "/cars?fuel=Electric" },
  { body: "Luxury", label: "Luxury", img: IMG.wraith, href: "/cars?min=100000000" },
  { body: "Hatchback", label: "Hatchbacks", img: IMG.golf, href: "/cars?body=Hatchback" },
  { body: "Motorbike", label: "Bikes", img: IMG.bikeSport, href: "/cars?body=Motorbike" },
];

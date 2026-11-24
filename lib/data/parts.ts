import { slug } from "../utils";

export type PartCategory =
  | "Engine" | "Brakes" | "Suspension" | "Electrical" | "Tyres" | "Lubricants" | "Filters" | "Lighting" | "Accessories" | "Body";

export interface Part {
  id: string;
  name: string;
  brand: string;
  category: PartCategory;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  fits: string[]; // makes, or "Universal"
  fitsText: string;
  stock: number;
  genuine: boolean;
  seller: string;
  sellerId: string;
  location: string;
}

export const PART_CATEGORIES: PartCategory[] = [
  "Engine", "Brakes", "Suspension", "Electrical", "Tyres", "Lubricants", "Filters", "Lighting", "Accessories", "Body",
];

type R = [string, string, string, PartCategory, number, number | 0, number, number, string[], string, number, boolean, string, string];

const rows: R[] = [
  ["brake-pads-camry", "Ceramic Front Brake Pads", "Akebono", "Brakes", 38_500, 45_000, 4.8, 1204, ["Toyota", "Lexus"], "Toyota Camry 2012–2024, Lexus ES 2013–2024", 42, true, "Ladipo Genuine Parts", "Mushin, Lagos"],
  ["brake-disc-pair", "Vented Brake Discs (Pair)", "Brembo", "Brakes", 96_000, 0, 4.9, 388, ["Mercedes-Benz", "BMW", "Audi"], "Mercedes C/E-Class, BMW 3/5 Series, Audi A4/A6", 14, true, "AutoPro Ikeja", "Ikeja, Lagos"],
  ["spark-plugs-iridium", "Iridium IX Spark Plugs (Set of 4)", "NGK", "Engine", 32_000, 36_000, 4.9, 2210, ["Toyota", "Honda", "Hyundai", "Nissan"], "Most 4-cylinder petrol engines", 120, true, "Ladipo Genuine Parts", "Mushin, Lagos"],
  ["timing-belt-kit", "Timing Belt Kit with Water Pump", "Gates", "Engine", 128_000, 0, 4.7, 214, ["Toyota", "Honda", "Hyundai"], "Toyota Corolla, Honda Accord 2008–2017", 9, true, "Nnewi Motor Spares", "Nnewi, Anambra"],
  ["engine-mount", "Hydraulic Engine Mount", "Toyota Genuine", "Engine", 74_000, 82_000, 4.6, 156, ["Toyota"], "Toyota Camry 2012–2017, Venza 2009–2015", 18, true, "Ladipo Genuine Parts", "Mushin, Lagos"],
  ["shock-absorbers", "Gas Shock Absorbers (Front Pair)", "KYB", "Suspension", 142_000, 160_000, 4.8, 642, ["Toyota", "Lexus", "Honda"], "Toyota Highlander, Lexus RX 2010–2019", 22, true, "AutoPro Ikeja", "Ikeja, Lagos"],
  ["control-arm", "Lower Control Arm with Bushing", "Lemförder", "Suspension", 88_000, 0, 4.7, 97, ["Mercedes-Benz", "BMW"], "Mercedes GLK/GLE, BMW X3/X5", 7, true, "Abuja Euro Parts", "Garki, Abuja"],
  ["battery-75ah", "75Ah Maintenance-Free Battery", "Exide", "Electrical", 118_000, 135_000, 4.7, 1890, ["Universal"], "Most sedans & mid-size SUVs", 64, true, "PowerCell Batteries", "Wuse, Abuja"],
  ["alternator-reman", "Remanufactured Alternator 130A", "Denso", "Electrical", 165_000, 0, 4.5, 133, ["Toyota", "Lexus"], "Toyota Camry, Sienna, Lexus RX 2007–2016", 6, true, "Nnewi Motor Spares", "Nnewi, Anambra"],
  ["obd-scanner", "Bluetooth OBD2 Diagnostic Scanner", "Autel", "Electrical", 54_000, 62_000, 4.6, 905, ["Universal"], "All cars 2001 and newer", 80, true, "GadgetGarage NG", "Yaba, Lagos"],
  ["michelin-primacy", "Primacy 4 · 215/55 R17", "Michelin", "Tyres", 148_000, 0, 4.9, 760, ["Universal"], "Camry, Accord, Sonata and similar", 48, true, "TyreHub Lagos", "Lekki, Lagos"],
  ["bridgestone-dueler", "Dueler H/T · 265/65 R17", "Bridgestone", "Tyres", 172_000, 189_000, 4.8, 412, ["Universal"], "Prado, Hilux, Fortuner, Pathfinder", 31, true, "TyreHub Lagos", "Lekki, Lagos"],
  ["mobil1-5w30", "Mobil 1 Advanced Full Synthetic 5W-30 (4L)", "Mobil", "Lubricants", 46_000, 52_000, 4.9, 3022, ["Universal"], "Most modern petrol engines", 300, true, "Lube Express", "Apapa, Lagos"],
  ["total-quartz-9000", "Quartz 9000 5W-40 (5L)", "TotalEnergies", "Lubricants", 41_500, 0, 4.8, 1880, ["Universal"], "Petrol & diesel engines", 260, true, "Lube Express", "Apapa, Lagos"],
  ["atf-ws", "Auto Transmission Fluid WS (4L)", "Toyota Genuine", "Lubricants", 58_000, 0, 4.8, 521, ["Toyota", "Lexus"], "Toyota & Lexus 6/8-speed automatics", 70, true, "Ladipo Genuine Parts", "Mushin, Lagos"],
  ["oil-filter", "Oil Filter 90915-YZZD", "Toyota Genuine", "Filters", 6_500, 8_000, 4.9, 4410, ["Toyota", "Lexus"], "Most Toyota & Lexus petrol engines", 900, true, "Ladipo Genuine Parts", "Mushin, Lagos"],
  ["cabin-filter", "Activated Carbon Cabin Filter", "Bosch", "Filters", 14_000, 0, 4.7, 1290, ["Toyota", "Honda", "Hyundai", "Kia"], "Japanese & Korean models 2012+", 210, true, "AutoPro Ikeja", "Ikeja, Lagos"],
  ["air-filter", "High-Flow Air Filter", "K&N", "Filters", 52_000, 0, 4.8, 344, ["Ford", "Chevrolet", "Dodge"], "Mustang, Camaro, Challenger 2015+", 25, true, "Muscle Parts NG", "Lekki, Lagos"],
  ["led-headlights", "LED Headlight Bulbs H11 (Pair)", "Philips", "Lighting", 48_000, 59_000, 4.6, 802, ["Universal"], "Any H11 fitment", 150, true, "GadgetGarage NG", "Yaba, Lagos"],
  ["tail-lamp-camry", "Tail Lamp Assembly (Right)", "Depo", "Lighting", 96_000, 0, 4.4, 76, ["Toyota"], "Toyota Camry 2018–2024", 8, false, "Nnewi Motor Spares", "Nnewi, Anambra"],
  ["dash-cam", "4K Front & Rear Dash Cam", "Viofo", "Accessories", 165_000, 185_000, 4.8, 455, ["Universal"], "All vehicles · 12V", 34, true, "GadgetGarage NG", "Yaba, Lagos"],
  ["gps-tracker", "4G GPS Tracker with Engine Immobiliser", "Teltonika", "Accessories", 89_000, 0, 4.7, 1120, ["Universal"], "All vehicles · Installation available", 95, true, "TrackSafe Nigeria", "Wuse, Abuja"],
  ["floor-mats", "All-Weather 3D Floor Mats", "WeatherTech", "Accessories", 72_000, 0, 4.9, 610, ["Toyota", "Lexus", "Honda", "Mercedes-Benz", "BMW"], "Model-specific fit — select your car", 40, true, "AutoPro Ikeja", "Ikeja, Lagos"],
  ["side-mirror", "Side Mirror Assembly, Heated (Left)", "Toyota Genuine", "Body", 145_000, 0, 4.5, 64, ["Toyota"], "Toyota Highlander 2014–2019", 5, true, "Ladipo Genuine Parts", "Mushin, Lagos"],
  ["front-bumper", "Front Bumper Cover (Primed)", "OEM-spec", "Body", 135_000, 150_000, 4.3, 88, ["Lexus"], "Lexus RX 350 2016–2019", 4, false, "Nnewi Motor Spares", "Nnewi, Anambra"],
  ["wiper-blades", "Aerotwin Wiper Blades (Pair)", "Bosch", "Accessories", 18_500, 22_000, 4.8, 2740, ["Universal"], "Select size at checkout", 400, true, "AutoPro Ikeja", "Ikeja, Lagos"],
];

export const PARTS: Part[] = rows.map(
  ([id, name, brand, category, price, oldPrice, rating, reviews, fits, fitsText, stock, genuine, seller, location]) => ({
    id, name, brand, category, price, oldPrice: oldPrice || undefined, rating, reviews, fits, fitsText, stock, genuine, seller, location,
    sellerId: slug(seller),
  }),
);

export const getPart = (id: string) => PARTS.find((p) => p.id === id);

export function deliveryFor(p: Part) {
  if (p.location.includes("Lagos")) return { label: "Tomorrow", note: "in Lagos · 2–3 days nationwide" };
  if (p.location.includes("Abuja")) return { label: "Tomorrow", note: "in Abuja · 2–3 days nationwide" };
  return { label: "In 2 days", note: "nationwide via NAM Express" };
}

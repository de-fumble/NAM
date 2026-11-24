import { IMG } from "./images";

export type ProCategory =
  | "Mechanic" | "Auto Electrician" | "Panel Beater" | "Inspection" | "AC Repair" | "Detailing" | "Vulcanizer" | "Driver"
  | "Clearing Agent" | "Tracker Install" | "Paperwork";

export interface Pro {
  id: string;
  name: string;
  title: string;
  category: ProCategory;
  city: string;
  state: string;
  rating: number;
  reviews: number;
  jobs: number;
  from: number;
  unit: string;
  responseMins: number;
  years: number;
  topRated: boolean;
  mobile: boolean; // comes to you
  skills: string[];
  bio: string;
  hue: number;
  portfolio: string[];
  packages: { name: string; price: number; desc: string; eta: string }[];
}

export const PRO_CATEGORIES: { key: ProCategory; label: string; blurb: string }[] = [
  { key: "Mechanic", label: "Mechanics", blurb: "Engine, gearbox, servicing" },
  { key: "Inspection", label: "Pre-purchase inspection", blurb: "Know before you buy" },
  { key: "Auto Electrician", label: "Auto electricians", blurb: "Wiring, sensors, ECU" },
  { key: "Panel Beater", label: "Panel & paint", blurb: "Body work, spraying" },
  { key: "AC Repair", label: "AC repair", blurb: "Gas refill, compressors" },
  { key: "Detailing", label: "Detailing", blurb: "Interior, ceramic, polish" },
  { key: "Vulcanizer", label: "Tyres & vulcanizers", blurb: "Mobile tyre service" },
  { key: "Driver", label: "Drivers", blurb: "Daily, interstate, chauffeur" },
  { key: "Clearing Agent", label: "Clearing agents", blurb: "Port & border clearing" },
  { key: "Tracker Install", label: "Tracker install", blurb: "GPS & immobilisers" },
  { key: "Paperwork", label: "Papers & plates", blurb: "Registration, renewals" },
];

const pkg = (base: number, names: [string, string, string], descs: [string, string, string], etas: [string, string, string]) =>
  names.map((name, i) => ({ name, price: Math.round((base * [1, 1.8, 3][i]) / 500) * 500, desc: descs[i], eta: etas[i] }));

export const PROS: Pro[] = [
  {
    id: "emeka-nwosu", name: "Emeka Nwosu", title: "Toyota & Lexus Master Technician", category: "Mechanic", city: "Ikeja", state: "Lagos",
    rating: 4.97, reviews: 412, jobs: 1380, from: 25_000, unit: "per visit", responseMins: 8, years: 14, topRated: true, mobile: true,
    skills: ["Engine overhaul", "Gearbox", "Computer diagnosis", "Toyota", "Lexus", "Hybrid systems"],
    bio: "Toyota-trained technician with 14 years on Japanese engines. I come to your home or office with a full diagnostic kit, and I only replace what needs replacing — with photos of every old part.",
    hue: 152, portfolio: [IMG.engineBay, IMG.engine, IMG.mechanic],
    packages: pkg(25_000, ["Diagnosis", "Full service", "Major repair"], ["Full computer scan and road test with written report", "Oil, filters, plugs, brake check, 40-point inspection", "Engine or gearbox repair, parts sourced at Ladipo prices"], ["Same day", "3 hours", "1–3 days"]),
  },
  {
    id: "fatima-yusuf", name: "Fatima Yusuf", title: "Certified Pre-Purchase Inspector", category: "Inspection", city: "Wuse II", state: "FCT Abuja",
    rating: 4.99, reviews: 286, jobs: 940, from: 35_000, unit: "per car", responseMins: 5, years: 9, topRated: true, mobile: true,
    skills: ["150-point inspection", "Flood damage", "Odometer fraud", "Paint depth", "Customs papers"],
    bio: "I inspect tokunbo and Nigerian-used cars before you pay. Paint-depth gauge, OBD scan, flood checks and customs paper verification — a full PDF report in two hours.",
    hue: 210, portfolio: [IMG.audiQ5, IMG.interior, IMG.engineBay],
    packages: pkg(35_000, ["Essential", "Complete", "Concierge"], ["100-point check with photos", "150-point check, paint depth, OBD scan, papers", "We find, inspect and negotiate the car for you"], ["2 hours", "Same day", "1 week"]),
  },
  {
    id: "segun-alabi", name: "Segun Alabi", title: "Auto Electrician & ECU Specialist", category: "Auto Electrician", city: "Surulere", state: "Lagos",
    rating: 4.9, reviews: 198, jobs: 620, from: 20_000, unit: "per visit", responseMins: 14, years: 11, topRated: true, mobile: true,
    skills: ["ECU programming", "Key coding", "Wiring harness", "Sensors", "Mercedes", "BMW"],
    bio: "German-car electrical specialist. Key programming, ECU repairs, check-engine lights and those mystery battery drains other people give up on.",
    hue: 38, portfolio: [IMG.engine, IMG.wrench, IMG.workshop],
    packages: pkg(20_000, ["Scan & fix", "Key programming", "ECU repair"], ["Diagnose and fix one electrical fault", "Program a new smart key or fob", "Bench repair or reprogramming of ECU"], ["Same day", "Same day", "2–4 days"]),
  },
  {
    id: "chidi-panel", name: "Chidi Eze", title: "Panel Beating & Spray Painting", category: "Panel Beater", city: "Trans-Ekulu", state: "Enugu",
    rating: 4.85, reviews: 154, jobs: 480, from: 45_000, unit: "per panel", responseMins: 25, years: 16, topRated: false, mobile: false,
    skills: ["Dent repair", "Spray booth", "Colour matching", "Bumper repair", "Rust treatment"],
    bio: "Oven-baked spray booth and computer colour matching. Your car comes back looking factory fresh, not 'Naija fresh'.",
    hue: 4, portfolio: [IMG.c63, IMG.fType, IMG.workshop],
    packages: pkg(45_000, ["Single panel", "Half body", "Full respray"], ["Dent repair and repaint of one panel", "Up to 5 panels, colour matched", "Complete respray with clear coat"], ["2 days", "5 days", "2 weeks"]),
  },
  {
    id: "kunle-ac", name: "Kunle Bakare", title: "Car AC Specialist", category: "AC Repair", city: "Lekki", state: "Lagos",
    rating: 4.88, reviews: 231, jobs: 870, from: 18_000, unit: "per job", responseMins: 10, years: 8, topRated: true, mobile: true,
    skills: ["Gas refill", "Compressor", "Leak detection", "Evaporator", "Blower motor"],
    bio: "Lagos heat is no joke. I fix car ACs on the spot — leak detection with UV dye, R134a and R1234yf refills, compressor replacement.",
    hue: 195, portfolio: [IMG.interior, IMG.engineBay, IMG.mechanicSmile],
    packages: pkg(18_000, ["Gas refill", "Full service", "Compressor"], ["Vacuum and recharge with leak test", "Refill, cabin filter, cleaning, leak fix", "Compressor replacement with warranty"], ["1 hour", "3 hours", "1 day"]),
  },
  {
    id: "glow-detail", name: "Glow Auto Spa", title: "Ceramic Coating & Detailing Studio", category: "Detailing", city: "Victoria Island", state: "Lagos",
    rating: 4.95, reviews: 344, jobs: 1210, from: 30_000, unit: "per car", responseMins: 7, years: 6, topRated: true, mobile: true,
    skills: ["Ceramic coating", "Paint correction", "Interior steam", "Headlight restoration", "PPF"],
    bio: "Premium detailing studio. We come to your home with water and power, or you visit our VI studio for ceramic and PPF.",
    hue: 280, portfolio: [IMG.porsche911, IMG.gt3, IMG.wraith],
    packages: pkg(30_000, ["Signature wash", "Deep detail", "Ceramic"], ["Exterior foam wash, interior vacuum, tyre shine", "Interior steam, paint decontamination, wax", "Two-stage correction + 3-year ceramic"], ["2 hours", "6 hours", "2 days"]),
  },
  {
    id: "musa-tyres", name: "Musa Ibrahim", title: "Mobile Vulcanizer & Wheel Alignment", category: "Vulcanizer", city: "Garki", state: "FCT Abuja",
    rating: 4.82, reviews: 129, jobs: 1640, from: 5_000, unit: "per job", responseMins: 12, years: 10, topRated: false, mobile: true,
    skills: ["Puncture repair", "Tyre change", "Balancing", "Alignment", "Run-flat"],
    bio: "Flat tyre on the expressway? I come to you anywhere in Abuja within 40 minutes, day or night.",
    hue: 25, portfolio: [IMG.r8, IMG.amgGtYellow, IMG.workshop],
    packages: pkg(5_000, ["Puncture fix", "Tyre swap", "Wheel care"], ["Plug and patch at your location", "Fit and balance four tyres", "Alignment, balancing and rotation"], ["40 mins", "1 hour", "2 hours"]),
  },
  {
    id: "ifeanyi-driver", name: "Ifeanyi Obi", title: "Executive & Interstate Driver", category: "Driver", city: "Ikoyi", state: "Lagos",
    rating: 4.93, reviews: 88, jobs: 310, from: 25_000, unit: "per day", responseMins: 20, years: 12, topRated: true, mobile: true,
    skills: ["Executive driving", "Interstate", "Defensive driving", "Airport runs", "Security-vetted"],
    bio: "Police-cleared, defensive-driving certified. Executive, family and interstate trips — Lagos to Abuja, Benin, Port Harcourt.",
    hue: 225, portfolio: [IMG.driving, IMG.bmw7, IMG.rangeRover],
    packages: pkg(25_000, ["Day hire", "Weekly", "Monthly"], ["Up to 10 hours within the city", "Six days, 10 hours/day", "Full-time dedicated driver"], ["Today", "This week", "From Monday"]),
  },
  {
    id: "seaport-clearing", name: "SeaPort Clearing Ltd", title: "Licensed Customs Clearing Agent", category: "Clearing Agent", city: "Apapa", state: "Lagos",
    rating: 4.8, reviews: 176, jobs: 2200, from: 150_000, unit: "per vehicle", responseMins: 30, years: 18, topRated: true, mobile: false,
    skills: ["Apapa & Tin Can", "Cotonou route", "Duty calculation", "Customs papers", "Delivery to door"],
    bio: "Importing from the US or Canada? We clear at Apapa, Tin Can and via Cotonou, with transparent duty receipts and delivery to your door.",
    hue: 170, portfolio: [IMG.expedition, IMG.tacoma, IMG.rav4],
    packages: pkg(150_000, ["Clearing only", "Clear + deliver", "End-to-end import"], ["Customs clearing at port with receipts", "Clearing, plates and delivery within Lagos", "Auction bidding, shipping, clearing and delivery"], ["5–10 days", "2 weeks", "6–8 weeks"]),
  },
  {
    id: "tracksafe", name: "TrackSafe Nigeria", title: "GPS Tracker & Immobiliser Install", category: "Tracker Install", city: "Wuse", state: "FCT Abuja",
    rating: 4.86, reviews: 503, jobs: 4100, from: 65_000, unit: "per car", responseMins: 9, years: 7, topRated: true, mobile: true,
    skills: ["4G trackers", "Remote immobiliser", "Fleet dashboards", "Fuel sensors"],
    bio: "Track and immobilise your car from your phone. Installation in 45 minutes at your location with a 1-year subscription included.",
    hue: 140, portfolio: [IMG.interior, IMG.camry, IMG.modelY],
    packages: pkg(65_000, ["Tracker", "Tracker + immobiliser", "Fleet"], ["4G tracker with app and 1-year plan", "Remote engine cut-off and alerts", "Up to 10 vehicles with fleet dashboard"], ["45 mins", "1 hour", "2 days"]),
  },
  {
    id: "papers-ng", name: "Ada Uche", title: "Vehicle Registration & Papers", category: "Paperwork", city: "Ikeja", state: "Lagos",
    rating: 4.9, reviews: 267, jobs: 1900, from: 15_000, unit: "per service", responseMins: 15, years: 9, topRated: false, mobile: true,
    skills: ["New registration", "Change of ownership", "Licence renewal", "Roadworthiness", "Proof of ownership"],
    bio: "Number plates, change of ownership, vehicle licence and roadworthiness renewals — done right and delivered to your door.",
    hue: 330, portfolio: [IMG.camry, IMG.hyundaiAccent, IMG.juke],
    packages: pkg(15_000, ["Renewal", "Change of ownership", "New registration"], ["Licence, roadworthiness and insurance renewal", "Full transfer of ownership documents", "Plates, registration and all papers for a new car"], ["2 days", "5 days", "1 week"]),
  },
  {
    id: "obinna-gearbox", name: "Obinna Chukwu", title: "Gearbox & Transmission Expert", category: "Mechanic", city: "Trans-Amadi", state: "Rivers",
    rating: 4.87, reviews: 142, jobs: 520, from: 30_000, unit: "per visit", responseMins: 18, years: 15, topRated: false, mobile: false,
    skills: ["Automatic gearbox", "CVT", "Torque converter", "Ford", "Honda", "Hyundai"],
    bio: "Fifteen years rebuilding automatic and CVT gearboxes. If your car is jerking, slipping or stuck in gear, bring it to Trans-Amadi.",
    hue: 260, portfolio: [IMG.workshop, IMG.wrench, IMG.engine],
    packages: pkg(30_000, ["Diagnosis", "Fluid service", "Rebuild"], ["Scan, road test and gearbox report", "ATF flush, filter and adaptation reset", "Full rebuild with 6-month warranty"], ["Same day", "4 hours", "4–6 days"]),
  },
];

export const getPro = (id: string) => PROS.find((p) => p.id === id);

export const REVIEWS = [
  { name: "Bolaji O.", text: "Came to my office in Ikeja within the hour, showed me the worn parts and fixed it on the spot. Honest pricing.", rating: 5, when: "2 weeks ago" },
  { name: "Ngozi A.", text: "Saved me from buying a flooded Venza. The report was detailed with photos. Worth every naira.", rating: 5, when: "1 month ago" },
  { name: "Ibrahim K.", text: "Professional, on time and polite. Will definitely book again.", rating: 5, when: "1 month ago" },
  { name: "Temi F.", text: "Good work, took a bit longer than estimated but kept me updated throughout.", rating: 4, when: "2 months ago" },
];

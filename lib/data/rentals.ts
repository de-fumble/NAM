import { IMG } from "./images";

export interface Rental {
  id: string;
  name: string;
  category: "Everyday" | "SUV" | "Executive" | "Wedding & Events" | "Bus";
  img: string;
  daily: number;
  seats: number;
  withDriver: boolean;
  selfDrive: boolean;
  cities: string[];
  perks: string[];
  rating: number;
  trips: number;
  companyId: string;
}

export const RENTALS: Rental[] = [
  { id: "r-camry", companyId: "lagos-luxe", name: "Toyota Camry 2020", category: "Everyday", img: IMG.camry, daily: 55_000, seats: 5, withDriver: true, selfDrive: true, cities: ["Lagos", "FCT Abuja", "Rivers"], perks: ["Fuel-efficient", "Airport pickup"], rating: 4.9, trips: 1240 },
  { id: "r-rav4", companyId: "capital-chauffeurs", name: "Toyota RAV4 2019", category: "SUV", img: IMG.rav4, daily: 75_000, seats: 5, withDriver: true, selfDrive: true, cities: ["Lagos", "FCT Abuja"], perks: ["Great for families", "Bluetooth"], rating: 4.8, trips: 860 },
  { id: "r-expedition", companyId: "lagos-luxe", name: "Ford Expedition 2019", category: "SUV", img: IMG.expedition, daily: 150_000, seats: 8, withDriver: true, selfDrive: false, cities: ["Lagos", "FCT Abuja", "Enugu"], perks: ["Interstate trips", "8 seats"], rating: 4.9, trips: 512 },
  { id: "r-rangerover", companyId: "capital-chauffeurs", name: "Range Rover Sport 2019", category: "Executive", img: IMG.rangeRover, daily: 250_000, seats: 5, withDriver: true, selfDrive: false, cities: ["Lagos", "FCT Abuja"], perks: ["Executive chauffeur", "Bottled water & Wi-Fi"], rating: 5.0, trips: 344 },
  { id: "r-bmw7", companyId: "lagos-luxe", name: "BMW 740Li 2021", category: "Executive", img: IMG.bmw7, daily: 280_000, seats: 4, withDriver: true, selfDrive: false, cities: ["Lagos", "FCT Abuja", "Rivers"], perks: ["Rear lounge seats", "Corporate billing"], rating: 4.9, trips: 298 },
  { id: "r-gle", companyId: "lagos-luxe", name: "Mercedes GLE Coupé 2019", category: "Executive", img: IMG.gleCoupe, daily: 220_000, seats: 5, withDriver: true, selfDrive: false, cities: ["Lagos"], perks: ["Chauffeur in suit", "Airport VIP"], rating: 4.9, trips: 405 },
  { id: "r-wraith", companyId: "lagos-luxe", name: "Rolls-Royce Wraith", category: "Wedding & Events", img: IMG.wraith, daily: 1_500_000, seats: 4, withDriver: true, selfDrive: false, cities: ["Lagos", "FCT Abuja"], perks: ["Ribbon décor", "Red-carpet arrival"], rating: 5.0, trips: 96 },
  { id: "r-mustang", companyId: "garden-city-hire", name: "Ford Mustang GT", category: "Wedding & Events", img: IMG.mustangGrey, daily: 180_000, seats: 4, withDriver: true, selfDrive: true, cities: ["Lagos"], perks: ["Photo-shoot ready", "Weekend deals"], rating: 4.8, trips: 210 },
];

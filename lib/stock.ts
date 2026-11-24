/**
 * What counts as "stock" (sample) data. Shared by client and server so the live/stock switch
 * hides exactly the same records everywhere.
 */
import { BUSINESSES, DEMO_ACCOUNTS } from "./data/businesses";

/** Demo shoppers used by the seed. */
export const DEMO_CUSTOMERS = [
  ["Adaeze Okonkwo", "+234 803 555 0101"], ["Bolaji Ogunleye", "+234 806 210 4433"], ["Hauwa Musa", "+234 703 118 9020"],
  ["Kelechi Uba", "+234 812 640 7781"], ["Tolu Adebayo", "+234 805 993 1200"], ["Ifeoma Nnaji", "+234 809 450 6677"],
] as const;

export const STOCK_BUSINESS_IDS: ReadonlySet<string> = new Set(BUSINESSES.map((b) => b.id));

/** Every phone number the sample data uses, exactly as stored. */
export const DEMO_PHONES: readonly string[] = Array.from(new Set([...DEMO_CUSTOMERS.map(([, p]) => p), ...DEMO_ACCOUNTS.map((d) => d.phone)]));

const last10 = (p: string) => p.replace(/\D/g, "").slice(-10);
const DEMO_DIGITS = new Set(DEMO_PHONES.map(last10));

/** True for demo numbers however they're formatted (+234 803…, 0803…, 803…). */
export const isDemoPhone = (phone: string | null | undefined) => !!phone && last10(phone).length === 10 && DEMO_DIGITS.has(last10(phone));
export const isStockBusiness = (id: string | null | undefined) => !!id && STOCK_BUSINESS_IDS.has(id);

/** Load the catalogue + demo activity into Supabase. Idempotent. Run after the migration: npm run db:seed */
import { seedDatabase } from "@/lib/server/repo";

const r = await seedDatabase();
console.log(r.activity ? "Seeded catalogue and demo activity." : "Catalogue up to date (activity already present, left untouched).");

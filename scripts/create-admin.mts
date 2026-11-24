/**
 * Create (or promote) an admin user in Supabase Auth.
 *   npm run admin:create -- you@company.com 'a-long-password'
 * Omit the password to generate one.
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const [email, given] = process.argv.slice(2);
if (!email) {
  console.error("Usage: npm run admin:create -- <email> [password]");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const s = createClient(url, key, { auth: { persistSession: false } });
const password = given || randomBytes(12).toString("base64url");

const { data: list } = await s.auth.admin.listUsers({ perPage: 1000 });
const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
const { error } = existing
  ? await s.auth.admin.updateUserById(existing.id, { app_metadata: { role: "admin" }, ...(given ? { password } : {}) })
  : await s.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: "admin" } });
if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
console.log(existing ? `Promoted ${email} to admin${given ? " and set the password" : ""}.` : `Created admin ${email}\nPassword: ${password}`);

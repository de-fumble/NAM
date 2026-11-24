import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && secret);

let admin: SupabaseClient | null = null;

/** Server-only client with the secret key. Bypasses RLS — every caller must authorise first. */
export function db(): SupabaseClient {
  if (!url || !secret) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY).");
  admin ??= createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

/**
 * Publishable-key client for password checks and auth emails (sign-up confirmation, password reset).
 * Stateless: tokens it receives are validated and dropped — our own httpOnly cookie is the session.
 * Implicit flow, so email links come back as `#access_token=…` that /auth/callback can hand to the server.
 */
export function authClient(): SupabaseClient {
  if (!url || !publishable) throw new Error("Supabase is not configured.");
  return createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: "implicit" } });
}

/** True when the email-auth migration (profiles.email / user_id) hasn't been applied yet. */
export function isMissingColumn(error: { code?: string; message?: string } | null | undefined) {
  return !!error && (error.code === "42703" || error.code === "PGRST204" || /column .* does not exist|Could not find the '.*' column/i.test(error.message ?? ""));
}

/** True when the schema migration hasn't been applied yet (PostgREST: relation not found). */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined) {
  return !!error && (error.code === "42P01" || error.code === "PGRST205" || /does not exist|Could not find the table/i.test(error.message ?? ""));
}

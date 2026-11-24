import { NextResponse } from "next/server";
import { cleanEmail, isEmail, normalizePhone, passwordProblem } from "@/lib/auth";
import { ROLE_META, type Business, type Role } from "@/lib/data/businesses";
import { IMG } from "@/lib/data/images";
import { audit, bizToRow, readSettings } from "@/lib/server/repo";
import { allow, clientIp } from "@/lib/server/ratelimit";
import { clearUserSession, getUserSession, setUserSession } from "@/lib/server/session";
import { authClient, db, isMissingColumn, isMissingTable, supabaseConfigured } from "@/lib/server/supabase";
import { isDemoPhone } from "@/lib/stock";
import { engineRunning, pausedMessage } from "@/lib/engines";
import { inMaintenance, maintenanceMessage } from "@/lib/server/engines";
import { slug } from "@/lib/utils";

/**
 * Marketplace accounts: email + password via Supabase Auth.
 *
 * Supabase only proves who someone is; the session itself is our signed httpOnly cookie (lib/server/session.ts),
 * so Supabase tokens are checked and then dropped. Each auth user has one row in `profiles`, keyed by the
 * contact phone number that listings, leads and orders are stored under.
 *
 * POST { action: "signup" | "signin" | "resend" | "forgot" | "confirm" | "reset", ... }
 * GET  → the signed-in user (re-read from the database), or { user: null }
 * DELETE → sign out
 */

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = Record<string, any>;
type AuthUser = { id: string; email?: string; email_confirmed_at?: string | null; app_metadata?: Any };

const ROLES: Role[] = ["customer", "dealer", "rental", "parts"];
const COVER: Record<Role, string> = { customer: IMG.interior, dealer: IMG.camry, rental: IMG.bmw7, parts: IMG.engine };
const PROFILE = "phone, name, role, business_id, status, email, user_id";
const MIN = 60_000;

class Fail extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}
const EXISTS = () => new Fail(409, "An account with this email already exists. Sign in instead.", "EXISTS");
const LINK = () => new Fail(401, "This link has expired or was already used. Sign in, or ask for a new link.", "LINK");

/** Where email links send people back to. Never taken from request headers a client controls. */
function siteUrl(req: Request) {
  return (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
}

async function profileBy(col: "phone" | "email" | "user_id", value: string) {
  const r = await db().from("profiles").select(PROFILE).eq(col, value).maybeSingle();
  if (isMissingColumn(r.error) || isMissingTable(r.error))
    throw new Fail(503, "Sign-in is being set up. An admin needs to apply the email sign-in database update in the admin console.", "MIGRATION");
  if (r.error) throw new Error(r.error.message);
  return r.data as Any | null;
}

const toUser = (p: Any) => ({ name: p.name, phone: p.phone, role: p.role as Role, businessId: p.business_id ?? undefined, email: p.email ?? undefined });

async function startSession(p: Any) {
  if (p.status === "suspended") throw new Fail(403, "This account has been suspended. Contact support.", "SUSPENDED");
  await setUserSession({ phone: p.phone, name: p.name, role: p.role, businessId: p.business_id ?? undefined, email: p.email ?? undefined, uid: p.user_id ?? undefined });
  await db().from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("phone", p.phone);
  return toUser(p);
}

async function profileFor(user: AuthUser) {
  const p = await profileBy("user_id", user.id);
  if (p) return p;
  if (user.app_metadata?.role === "admin") throw new Fail(403, "That's an admin account. Sign in to the admin console at /admin instead.", "ADMIN");
  throw new Fail(404, "There's no marketplace account for this email yet. Create one to continue.", "NO_PROFILE");
}

/** Map Supabase Auth errors to messages people can act on. */
function authFail(e: { code?: string; message: string; status?: number }) {
  switch (e.code) {
    case "user_already_exists":
    case "email_exists":
      return EXISTS();
    case "invalid_credentials":
      return new Fail(401, "Wrong email or password.", "CREDENTIALS");
    case "weak_password":
      return new Fail(400, e.message);
    case "email_address_invalid":
      return new Fail(400, "That email address can't receive mail. Check it and try again.");
    case "email_address_not_authorized":
      return new Fail(400, "We can't send email to this address yet. The site's email delivery still needs setting up — please try again later.", "SMTP");
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return new Fail(429, "Too many emails sent in a short time. Wait a few minutes and try again.", "RATE");
    default:
      console.error("[auth]", e.code, e.message);
      return new Fail(e.status && e.status < 500 ? 400 : 502, e.message || "Sign-in is unavailable right now. Please try again.");
  }
}

/* --------------------------------- actions --------------------------------- */

async function signup(b: Any, req: Request) {
  const name = String(b.name ?? "").trim().slice(0, 80);
  const email = cleanEmail(String(b.email ?? ""));
  const password = String(b.password ?? "");
  const phone = normalizePhone(String(b.phone ?? ""));
  const role = b.role as Role;
  const bizName = String(b.business?.name ?? "").trim().slice(0, 80);
  const state = String(b.business?.state ?? "").trim().slice(0, 40);
  const city = String(b.business?.city ?? "").trim().slice(0, 60);

  if (name.length < 2) throw new Fail(400, "Enter your full name.");
  if (!isEmail(email)) throw new Fail(400, "Enter a valid email address.");
  if (!phone) throw new Fail(400, "Enter a Nigerian mobile number, e.g. 0803 123 4567.");
  const weak = passwordProblem(password);
  if (weak) throw new Fail(400, weak);
  if (!ROLES.includes(role)) throw new Fail(400, "Choose how you'll use Naija Auto.");
  if (role !== "customer" && (bizName.length < 2 || !state)) throw new Fail(400, "Enter your business name and state.");
  if (!allow(`signup:${clientIp(req)}`, 6, 10 * MIN)) throw new Fail(429, "Too many sign-up attempts. Try again in a few minutes.", "RATE");

  const settings = await readSettings();
  const signups = settings.engines.signups;
  if (!engineRunning(signups)) throw new Fail(403, pausedMessage("signups", signups), "CLOSED");
  if (role !== "customer" && !signups.params.businessAccounts)
    throw new Fail(403, "Business accounts can't be opened right now. You can still create a shopper account.", "CLOSED");
  const verifyEmail = !!signups.params.emailVerification;
  if (isDemoPhone(phone)) throw new Fail(409, "That number belongs to a demo account. Use your own number.");

  const [byPhone, byEmail] = await Promise.all([profileBy("phone", phone), profileBy("email", email)]);
  if (byEmail && byEmail.phone !== phone) throw EXISTS();
  if (byPhone?.user_id && byPhone.email !== email) throw new Fail(409, "This phone number is already linked to another account.", "PHONE_TAKEN");
  if (byPhone?.status === "suspended") throw new Fail(403, "This account has been suspended. Contact support.", "SUSPENDED");
  // `byPhone` with the same email = an earlier sign-up that never confirmed; finishing it again is fine.
  // `byPhone` with no login at all = a profile from the old phone-only sign-in (never verified); this account takes it over.
  const fresh = !byPhone?.user_id;

  const s = db();
  let uid: string;
  let confirmed: boolean;
  if (verifyEmail) {
    // Sends the confirmation email (when "Confirm email" is on in Supabase → Authentication).
    const r = await authClient().auth.signUp({ email, password, options: { emailRedirectTo: `${siteUrl(req)}/auth/callback`, data: { name } } });
    if (r.error) throw authFail(r.error);
    if (!r.data.user || r.data.user.identities?.length === 0) throw EXISTS();
    uid = r.data.user.id;
    confirmed = !!r.data.session || !!r.data.user.email_confirmed_at;
  } else {
    const r = await s.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
    if (r.error) throw authFail(r.error);
    uid = r.data.user.id;
    confirmed = true;
  }

  try {
    let businessId: string | undefined = byPhone?.role === role ? (byPhone.business_id ?? undefined) : undefined;
    if (role !== "customer" && !businessId) {
      const id = `${slug(bizName) || role}-${Math.random().toString(36).slice(2, 6)}`;
      const biz: Business = {
        id, name: bizName, type: role, tagline: ROLE_META[role].label, about: "", city: city || state, state, phone,
        rating: 5, reviews: 0, since: new Date().getFullYear(), responseMins: 15, verified: false, cover: COVER[role], hue: (id.length * 37) % 360,
      };
      const ins = await s.from("businesses").insert(bizToRow(biz, phone));
      if (ins.error) throw new Error(ins.error.message);
      businessId = id;
      await audit(`user:${phone}`, "business.create", "businesses", id, { name: bizName, type: role });
    }
    const up = await s
      .from("profiles")
      .upsert({ phone, name, role, business_id: businessId ?? null, email, user_id: uid, last_seen_at: new Date().toISOString() }, { onConflict: "phone" });
    if (isMissingColumn(up.error)) throw new Fail(503, "Sign-in is being set up. An admin needs to apply the email sign-in database update.", "MIGRATION");
    if (up.error) throw new Error(up.error.message);
  } catch (e) {
    // Don't leave a login behind that has no marketplace account.
    if (fresh) await s.auth.admin.deleteUser(uid).catch(() => {});
    throw e;
  }
  if (fresh) await audit(`user:${phone}`, byPhone ? "user.claim" : "user.signup", "profiles", phone, { role, verify: verifyEmail && !confirmed });

  if (!confirmed) return { ok: true, verify: true, email };
  return { ok: true, user: await startSession((await profileBy("phone", phone))!) };
}

async function signin(b: Any, req: Request) {
  const email = cleanEmail(String(b.email ?? ""));
  const password = String(b.password ?? "");
  if (!isEmail(email) || !password) throw new Fail(400, "Enter your email and password.");
  if (!allow(`signin:${clientIp(req)}`, 12, 5 * MIN) || !allow(`signin:${email}`, 8, 15 * MIN))
    throw new Fail(429, "Too many sign-in attempts. Wait a few minutes and try again.", "RATE");

  const c = authClient();
  let r = await c.auth.signInWithPassword({ email, password });
  if (r.error?.code === "email_not_confirmed") {
    if ((await readSettings()).engines.signups.params.emailVerification) throw new Fail(403, `Confirm your email first. We sent a link to ${email}.`, "UNCONFIRMED");
    // Verification has since been switched off: let earlier, unconfirmed sign-ups in.
    const p = await profileBy("email", email);
    if (p?.user_id) {
      await db().auth.admin.updateUserById(p.user_id, { email_confirm: true });
      r = await c.auth.signInWithPassword({ email, password });
    }
  }
  if (r.error) throw authFail(r.error);
  return { ok: true, user: await startSession(await profileFor(r.data.user)) };
}

async function resend(b: Any, req: Request) {
  const email = cleanEmail(String(b.email ?? ""));
  if (!isEmail(email)) throw new Fail(400, "Enter a valid email address.");
  if (!allow(`mail:${email}`, 3, 15 * MIN) || !allow(`mail:${clientIp(req)}`, 8, 15 * MIN)) throw new Fail(429, "Too many emails requested. Wait a few minutes.", "RATE");
  const r = await authClient().auth.resend({ type: "signup", email, options: { emailRedirectTo: `${siteUrl(req)}/auth/callback` } });
  if (r.error && ["over_email_send_rate_limit", "over_request_rate_limit", "email_address_not_authorized"].includes(r.error.code ?? "")) throw authFail(r.error);
  return { ok: true }; // same answer whether or not the account exists
}

async function forgot(b: Any, req: Request) {
  const email = cleanEmail(String(b.email ?? ""));
  if (!isEmail(email)) throw new Fail(400, "Enter a valid email address.");
  if (!allow(`mail:${email}`, 3, 15 * MIN) || !allow(`mail:${clientIp(req)}`, 8, 15 * MIN)) throw new Fail(429, "Too many emails requested. Wait a few minutes.", "RATE");
  const r = await authClient().auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl(req)}/auth/reset` });
  if (r.error && ["over_email_send_rate_limit", "over_request_rate_limit", "email_address_not_authorized"].includes(r.error.code ?? "")) throw authFail(r.error);
  return { ok: true };
}

/** The token from an email link (`#access_token=…`), checked with Supabase before we trust it. */
async function userFromToken(token: unknown) {
  if (typeof token !== "string" || token.length < 20 || token.length > 4096) throw LINK();
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) throw LINK();
  return data.user as AuthUser;
}

async function confirm(b: Any) {
  const user = await userFromToken(b.token);
  if (!user.email_confirmed_at) throw LINK();
  return { ok: true, user: await startSession(await profileFor(user)) };
}

async function reset(b: Any, req: Request) {
  const password = String(b.password ?? "");
  const weak = passwordProblem(password);
  if (weak) throw new Fail(400, weak);
  if (!allow(`reset:${clientIp(req)}`, 6, 15 * MIN)) throw new Fail(429, "Too many attempts. Wait a few minutes.", "RATE");
  const user = await userFromToken(b.token);
  const r = await db().auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (r.error) throw authFail(r.error);
  return { ok: true, user: await startSession(await profileFor(user)) };
}

/* --------------------------------- handlers -------------------------------- */

const ACTIONS: Record<string, (b: Any, req: Request) => Promise<object>> = { signup, signin, resend, forgot, confirm, reset };

export async function POST(req: Request) {
  if (!supabaseConfigured) return NextResponse.json({ mode: "local" });
  const b = (await req.json().catch(() => null)) as Any | null;
  const fn = b && ACTIONS[String(b.action)];
  if (!fn) return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  try {
    // Maintenance closes sign-up and sign-in. Email links (confirm, reset) still finish.
    if (b.action === "signup" || b.action === "signin") {
      const settings = await readSettings();
      if (inMaintenance(settings)) throw new Fail(503, maintenanceMessage(settings), "MAINTENANCE");
    }
    return NextResponse.json(await fn(b, req));
  } catch (e) {
    if (e instanceof Fail) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    console.error("[auth]", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function GET() {
  if (!supabaseConfigured) return NextResponse.json({ mode: "local" });
  const session = await getUserSession();
  if (!session) return NextResponse.json({ user: null });
  // Demo sessions (stock data only) carry no Supabase user.
  if (!session.uid) return NextResponse.json({ user: { name: session.name, phone: session.phone, role: session.role, businessId: session.businessId }, demo: true });
  try {
    const p = await profileBy("user_id", session.uid);
    if (!p || p.status === "suspended") {
      await clearUserSession();
      return NextResponse.json({ user: null, reason: p ? "This account has been suspended." : "Your account no longer exists." });
    }
    // An admin may have changed the role or business since sign-in: keep the cookie in step.
    if (p.role !== session.role || (p.business_id ?? undefined) !== session.businessId || p.name !== session.name || p.phone !== session.phone)
      await setUserSession({ phone: p.phone, name: p.name, role: p.role, businessId: p.business_id ?? undefined, email: p.email ?? undefined, uid: p.user_id });
    return NextResponse.json({ user: toUser(p) });
  } catch (e) {
    if (e instanceof Fail) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    throw e;
  }
}

export async function DELETE() {
  await clearUserSession();
  return NextResponse.json({ ok: true });
}

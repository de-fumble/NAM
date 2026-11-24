import { NextResponse } from "next/server";
import { audit } from "@/lib/server/repo";
import { clearAdminSession, setAdminSession } from "@/lib/server/session";
import { authClient, supabaseConfigured } from "@/lib/server/supabase";

// Simple in-memory throttle per IP (resets on deploy). Supabase Auth adds its own rate limits too.
const attempts = new Map<string, { n: number; until: number }>();

export async function POST(req: Request) {
  if (!supabaseConfigured) return NextResponse.json({ error: "Supabase is not configured on the server." }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const a = attempts.get(ip);
  if (a && a.n >= 5 && a.until > Date.now()) return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });

  const { email, password } = ((await req.json().catch(() => ({}))) ?? {}) as { email?: string; password?: string };
  if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

  const { data, error } = await authClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || data.user?.app_metadata?.role !== "admin") {
    const cur = a && a.until > Date.now() ? a : { n: 0, until: Date.now() + 10 * 60_000 };
    attempts.set(ip, { n: cur.n + 1, until: cur.until });
    return NextResponse.json({ error: "Incorrect email or password, or this account isn't an admin." }, { status: 401 });
  }
  attempts.delete(ip);
  await setAdminSession({ email: data.user.email!, uid: data.user.id });
  await audit(`admin:${data.user.email}`, "admin.login", "auth.users", data.user.id).catch(() => {});
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}

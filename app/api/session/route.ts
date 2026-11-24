import { NextResponse } from "next/server";
import { DEMO_ACCOUNTS } from "@/lib/data/businesses";
import { readSettings } from "@/lib/server/repo";
import { engineRunning, pausedMessage } from "@/lib/engines";
import { inMaintenance, maintenanceMessage } from "@/lib/server/engines";
import { clearUserSession, setUserSession } from "@/lib/server/session";
import { db, isMissingTable, supabaseConfigured } from "@/lib/server/supabase";

/**
 * Demo accounts only (stock data). Real accounts sign in with email + password via /api/auth.
 * The client names a demo account by phone; everything else comes from the server's own list,
 * so this can't be used to sign in as anyone else.
 */
export async function POST(req: Request) {
  if (!supabaseConfigured) return NextResponse.json({ mode: "local" });
  const body = (await req.json().catch(() => null)) as { phone?: string } | null;
  const d = DEMO_ACCOUNTS.find((a) => a.phone === body?.phone);
  if (!d) return NextResponse.json({ error: "Sign in with your email and password." }, { status: 400 });

  const settings = await readSettings().catch((e) => (isMissingTable(e) ? null : Promise.reject(e)));
  if (!settings) return NextResponse.json({ mode: "local" }, { status: 503 });
  if (settings.dataMode === "live")
    return NextResponse.json({ error: "Demo accounts are switched off — the marketplace is on live data. Sign in with your own account.", code: "DEMO_OFF" }, { status: 403 });
  if (inMaintenance(settings)) return NextResponse.json({ error: maintenanceMessage(settings), code: "MAINTENANCE" }, { status: 503 });
  if (!engineRunning(settings.engines.demo)) return NextResponse.json({ error: pausedMessage("demo", settings.engines.demo), code: "DEMO_OFF" }, { status: 403 });

  const p = await db().from("profiles").select("status").eq("phone", d.phone).maybeSingle();
  if (p.data?.status === "suspended") return NextResponse.json({ error: "This demo account has been suspended." }, { status: 403 });

  const user = { name: d.name, phone: d.phone, role: d.role, businessId: d.businessId };
  await setUserSession(user);
  return NextResponse.json({ ok: true, user });
}

export async function DELETE() {
  await clearUserSession();
  return NextResponse.json({ ok: true });
}

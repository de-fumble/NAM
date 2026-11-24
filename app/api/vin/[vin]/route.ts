import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession, getUserSession } from "@/lib/server/session";
import { allowLookup, decodeVin, isCached } from "@/lib/server/vin";
import { readSettings } from "@/lib/server/repo";
import { EngineOff, inMaintenance, maintenanceMessage, requireEngine } from "@/lib/server/engines";
import { supabaseConfigured } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

const STATUS = { INVALID: 400, NOT_FOUND: 404, RATE_LIMITED: 429, UNAVAILABLE: 503, SIGN_IN: 401, PAUSED: 423 } as const;
const fail = (code: keyof typeof STATUS, message: string, headers?: HeadersInit) => NextResponse.json({ ok: false, code, message }, { status: STATUS[code], headers });

/** The VIN engine's rules (Admin → Engines → VIN check). Without Supabase, the defaults apply. */
async function rules() {
  if (!supabaseConfigured) return { requireSignIn: true, perMinute: 12 };
  const settings = await readSettings();
  if (inMaintenance(settings)) throw new EngineOff("maintenance", maintenanceMessage(settings));
  const p = requireEngine(settings, "vin");
  return { requireSignIn: !!p.requireSignIn, perMinute: Number(p.perMinute) };
}

/** GET /api/vin/:vin → { ok: true, report } | { ok: false, code, message } */
export async function GET(req: NextRequest, { params }: { params: Promise<{ vin: string }> }) {
  let r: Awaited<ReturnType<typeof rules>>;
  try {
    r = await rules();
  } catch (e) {
    if (e instanceof EngineOff) return fail("PAUSED", e.message);
    return fail("UNAVAILABLE", "VIN checks are unavailable right now.");
  }
  // By default guests can browse but not run checks (each one costs an auto.dev call).
  const admin = await getAdminSession();
  const user = admin ? null : await getUserSession();
  if (r.requireSignIn && !admin && !user) return fail("SIGN_IN", "Sign in to run a VIN check.");
  const { vin } = await params;
  const who = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";

  if (!admin && !isCached(vin) && !allowLookup(user ? `u:${user.phone}` : who, r.perMinute))
    return fail("RATE_LIMITED", "You've run a lot of checks. Wait a minute and try again.", { "Retry-After": "60" });

  const result = await decodeVin(decodeURIComponent(vin));
  return NextResponse.json(result, {
    status: result.ok ? 200 : STATUS[result.code],
    headers: { "Cache-Control": result.ok ? "private, max-age=3600" : "no-store" },
  });
}

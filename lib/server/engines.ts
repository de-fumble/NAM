import "server-only";
import { engineRunning, pausedMessage, type EngineKey, type ParamValue } from "@/lib/engines";
import type { PlatformSettings } from "@/lib/settings";

/**
 * Server-side engine gate. Status 423 (Locked) is deliberate: the client treats 401/403 as
 * "you've been signed out", and a paused feature must never sign anyone out.
 */
export class EngineOff extends Error {
  status = 423;
  code = "PAUSED";
  constructor(public engine: EngineKey, message: string) {
    super(message);
  }
}

/** Throws if the engine isn't running right now; returns its params otherwise. */
export function requireEngine(settings: PlatformSettings, key: EngineKey): Record<string, ParamValue> {
  const s = settings.engines[key];
  if (!engineRunning(s)) throw new EngineOff(key, pausedMessage(key, s));
  return s.params;
}

export const inMaintenance = (settings: PlatformSettings) => engineRunning(settings.engines.maintenance);
export const maintenanceMessage = (settings: PlatformSettings) => pausedMessage("maintenance", settings.engines.maintenance);

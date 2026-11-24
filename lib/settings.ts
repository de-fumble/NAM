/** Platform-wide settings controlled from the admin dashboard. Shared by client and server. */

import { DEFAULT_ENGINES, type Engines } from "./engines";

/**
 * Which data pipeline the marketplace runs on.
 * - `stock`: the built-in sample catalogue (demo dealers, cars, parts, fleet, pros and activity) alongside real data.
 * - `live`:  only what real users create. Every stock record is hidden from shoppers, dashboards and admin stats.
 */
export type DataMode = "stock" | "live";

export interface PlatformSettings {
  feePercent: number;
  dataMode: DataMode;
  /** Feature switches, schedules and rules. See lib/engines.ts. */
  engines: Engines;
}
export const DEFAULT_SETTINGS: PlatformSettings = { feePercent: 2.5, dataMode: "stock", engines: DEFAULT_ENGINES };

"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Renders the public marketplace chrome everywhere except the admin console. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith("/admin") ? null : <>{children}</>;
}

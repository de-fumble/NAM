import type { Metadata } from "next";

import { Verify } from "@/components/verify";

export const metadata: Metadata = { title: "VIN check" };

export default function Page() {
  return <Verify />;
}

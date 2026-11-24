import type { Metadata } from "next";

import { Saved } from "@/components/collections";

export const metadata: Metadata = { title: "Saved" };

export default function Page() {
  return <Saved />;
}

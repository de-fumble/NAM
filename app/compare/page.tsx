import type { Metadata } from "next";

import { Compare } from "@/components/collections";

export const metadata: Metadata = { title: "Compare cars" };

export default function Page() {
  return <Compare />;
}

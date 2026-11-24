import type { Metadata } from "next";

import { Rentals } from "@/components/rentals";

export const metadata: Metadata = { title: "Rent a car" };

export default function Page() {
  return <Rentals />;
}

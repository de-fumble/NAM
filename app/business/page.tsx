import type { Metadata } from "next";
import { BusinessLanding } from "@/components/business";

export const metadata: Metadata = { title: "Sell on Naija Auto" };

export default function Page() {
  return <BusinessLanding />;
}

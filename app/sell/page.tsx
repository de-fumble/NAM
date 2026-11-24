import type { Metadata } from "next";
import { SellWizard } from "@/components/sell";

export const metadata: Metadata = { title: "Sell your car" };

export default function SellPage() {
  return <SellWizard />;
}

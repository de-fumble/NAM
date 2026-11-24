import { Suspense } from "react";
import type { Metadata } from "next";
import { PartsStore } from "@/components/parts";

export const metadata: Metadata = { title: "Spare parts" };

export default function PartsPage() {
  return (
    <Suspense>
      <PartsStore />
    </Suspense>
  );
}

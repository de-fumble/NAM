import { Suspense } from "react";
import type { Metadata } from "next";
import { ServicesHub } from "@/components/services";

export const metadata: Metadata = { title: "Hire a pro" };

export default function ServicesPage() {
  return (
    <Suspense>
      <ServicesHub />
    </Suspense>
  );
}

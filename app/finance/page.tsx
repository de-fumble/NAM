import type { Metadata } from "next";
import { Suspense } from "react";
import { Finance } from "@/components/finance";

export const metadata: Metadata = { title: "Loans, insurance & import duty" };

export default function Page() {
  return <Suspense><Finance /></Suspense>;
}

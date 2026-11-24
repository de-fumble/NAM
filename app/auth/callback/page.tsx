import type { Metadata } from "next";
import { AuthCallback } from "@/components/auth";

export const metadata: Metadata = { title: "Confirming your email", robots: { index: false } };

export default function Page() {
  return <AuthCallback />;
}

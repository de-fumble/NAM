import type { Metadata } from "next";
import { AuthPage } from "@/components/auth";

export const metadata: Metadata = { title: "Create account" };

export default function Page() {
  return <AuthPage initial="signup" />;
}

import type { Metadata } from "next";
import { AuthPage } from "@/components/auth";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return <AuthPage initial="signin" />;
}

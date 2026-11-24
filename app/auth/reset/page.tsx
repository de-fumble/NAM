import type { Metadata } from "next";
import { ResetPassword } from "@/components/auth";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function Page() {
  return <ResetPassword />;
}

import { notFound } from "next/navigation";
import { AdminScreen } from "@/components/admin/sections";

const SECTIONS = ["users", "businesses", "cars", "parts", "fleet", "orders", "bookings", "leads", "messages", "requests", "engines", "settings", "audit"];

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  if (!SECTIONS.includes((await params).section)) notFound();
  return <AdminScreen />;
}

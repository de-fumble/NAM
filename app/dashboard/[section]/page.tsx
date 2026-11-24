import { DashboardScreen } from "@/components/dashboard/router";

export function generateStaticParams() {
  return ["orders", "bookings", "messages", "requests", "saved", "settings", "inventory", "leads", "payouts", "fleet", "products"].map((section) => ({ section }));
}

export default function Page() {
  return <DashboardScreen />;
}

"use client";

import type { ComponentType } from "react";
import type { Role } from "@/lib/data/businesses";
import { useApp } from "@/lib/store";
import { CustomerBookings, CustomerOrders, CustomerOverview, CustomerRequests, CustomerSaved } from "./customer";
import { DealerInventory, DealerLeads, DealerOverview } from "./dealer";
import { PartsOrders, PartsOverview, PartsProducts, PartsRequests } from "./parts";
import { RentalBookings, RentalFleet, RentalOverview } from "./rental";
import { Messages, Payouts, Settings } from "./shared";
import { useSection, type SectionId } from "./shell";

const SCREENS: Record<Role, Partial<Record<SectionId, ComponentType>>> = {
  customer: { overview: CustomerOverview, orders: CustomerOrders, bookings: CustomerBookings, messages: Messages, requests: CustomerRequests, saved: CustomerSaved, settings: Settings },
  dealer: { overview: DealerOverview, inventory: DealerInventory, leads: DealerLeads, messages: Messages, payouts: Payouts, settings: Settings },
  rental: { overview: RentalOverview, bookings: RentalBookings, fleet: RentalFleet, messages: Messages, payouts: Payouts, settings: Settings },
  parts: { overview: PartsOverview, orders: PartsOrders, products: PartsProducts, requests: PartsRequests, messages: Messages, payouts: Payouts, settings: Settings },
};

export function DashboardScreen() {
  const user = useApp((s) => s.user);
  const section = useSection();
  if (!user) return null;
  const set = SCREENS[user.role];
  const Screen = set[section] ?? set.overview!;
  return <Screen />;
}

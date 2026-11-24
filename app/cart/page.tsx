import type { Metadata } from "next";
import { Cart } from "@/components/cart";

export const metadata: Metadata = { title: "Bag" };

export default function CartPage() {
  return <Cart />;
}

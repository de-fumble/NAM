import type { Metadata } from "next";
import { Storefront } from "@/components/storefront";
import { BUSINESSES } from "@/lib/data/businesses";

export function generateStaticParams() {
  return BUSINESSES.map((b) => ({ id: b.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: BUSINESSES.find((b) => b.id === id)?.name ?? "Storefront" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Storefront id={id} />;
}

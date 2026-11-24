import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProPage as ProView } from "@/components/services";
import { PROS, getPro } from "@/lib/data/pros";

export function generateStaticParams() {
  return PROS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const pro = getPro((await params).id);
  return { title: pro ? `${pro.name} — ${pro.title}` : "Pro not found" };
}

export default async function ProPage({ params }: { params: Promise<{ id: string }> }) {
  const pro = getPro((await params).id);
  if (!pro) notFound();
  return <ProView pro={pro} />;
}

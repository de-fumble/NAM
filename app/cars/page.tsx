import { Suspense } from "react";
import type { Metadata } from "next";
import { Browse } from "@/components/browse";
import { CarCardSkeleton } from "@/components/cards";

export const metadata: Metadata = { title: "Buy a car" };

export default function CarsPage() {
  return (
    <Suspense fallback={<BrowseSkeleton />}>
      <Browse />
    </Suspense>
  );
}

function BrowseSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 pt-[132px] sm:px-8">
      <div className="shimmer h-12 w-64 rounded-xl" />
      <div className="shimmer mt-3 h-5 w-96 max-w-full rounded-lg" />
      <div className="mt-16 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CarCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

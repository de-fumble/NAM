import { CarCardSkeleton } from "@/components/cards";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 pt-[132px] sm:px-8">
      <div className="shimmer h-12 w-64 rounded-xl" />
      <div className="mt-16 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CarCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

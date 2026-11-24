import type { Metadata } from "next";
import { ListingFallback } from "@/components/car-detail";
import { CARS, getCar } from "@/lib/data/cars";

export function generateStaticParams() {
  return CARS.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const car = getCar((await params).id);
  return { title: car ? `${car.year} ${car.make} ${car.model} ${car.trim}` : "Car listing" };
}

export default async function CarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const car = getCar(id);
  // Listings created in the browser aren't in the static catalogue — resolve them on the client.
  // Stock catalogue cars render on the server, then hand over to the client, which hides them when
  // the platform is on live data. Listings created by users are resolved on the client.
  return <ListingFallback id={id} initial={car} />;
}

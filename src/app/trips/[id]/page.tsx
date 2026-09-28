import { notFound } from "next/navigation";
import { getTrip } from "@/lib/trips";
import TripDetailClient from "@/components/TripDetailClient";

export const dynamic = "force-dynamic";

interface TripPageProps {
  params: Promise<{ id: string }>;
}

export default async function TripPage({ params }: TripPageProps) {
  const { id } = await params;
  const tripId = Number(id);
  if (!Number.isInteger(tripId)) notFound();

  const trip = await getTrip(tripId);
  if (!trip) notFound();

  return <TripDetailClient trip={trip} />;
}

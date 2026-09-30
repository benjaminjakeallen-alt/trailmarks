import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
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

  const viewer = await requireViewer();
  const trip = await getTrip(tripId, viewer.familyId);
  if (!trip) notFound();

  return <TripDetailClient trip={trip} />;
}

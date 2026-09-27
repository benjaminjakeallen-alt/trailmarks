import Link from "next/link";
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

  const trip = getTrip(tripId);
  if (!trip) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
      <Link href="/trips" className="text-sm font-medium text-foreground-muted hover:text-accent">
        ← Back to trips
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{trip.title}</h1>
        {trip.description && <p className="mt-2 text-foreground-muted">{trip.description}</p>}
      </header>

      <TripDetailClient trip={trip} />
    </div>
  );
}

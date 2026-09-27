import Link from "next/link";
import { listTrips, getTrip } from "@/lib/trips";
import TripCard from "@/components/TripCard";

export const dynamic = "force-dynamic";

export default function TripsPage() {
  const trips = listTrips();
  const enriched = trips.map((trip) => {
    const detail = getTrip(trip.id);
    return {
      trip,
      stateCount: detail?.stateCodes.length ?? 0,
      distanceMiles: detail?.distanceMiles ?? 0,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Trips</h1>
          <p className="mt-2 text-foreground-muted">
            Start a trip to auto-track your route and build its map as you go.
          </p>
        </div>
        <Link
          href="/trips/new"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          + New trip
        </Link>
      </header>

      {trips.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-foreground-muted">
          No trips yet — start one and Trailmarks will draw the map as you travel.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {enriched.map(({ trip, stateCount, distanceMiles }) => (
            <TripCard key={trip.id} trip={trip} stateCount={stateCount} distanceMiles={distanceMiles} />
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import type { Trip } from "@/lib/types";

interface TripCardProps {
  trip: Trip;
  stateCount?: number;
  distanceMiles?: number;
}

function formatDateRange(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) return "Not started yet";
  const start = new Date(startedAt);
  const startLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (!endedAt) return `Started ${startLabel}`;
  const end = new Date(endedAt);
  const endLabel = end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

const STATUS_LABEL: Record<Trip["status"], string> = {
  planned: "Not started",
  active: "In progress",
  completed: "Completed",
};

export default function TripCard({ trip, stateCount, distanceMiles }: TripCardProps) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group block overflow-hidden rounded-3xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[16/10] w-full bg-surface-muted">
        {trip.coverPhotoUrl ? (
          <Image
            src={trip.coverPhotoUrl}
            alt={trip.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🗺️</div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-white/70">
            {STATUS_LABEL[trip.status]}
            {trip.status === "active" && " ●"}
          </p>
          <h3 className="font-display text-xl font-semibold text-white">{trip.title}</h3>
        </div>
      </div>
      <div className="flex items-center justify-between p-4 text-sm text-foreground-muted">
        <span>{formatDateRange(trip.startedAt, trip.endedAt)}</span>
        <span className="flex items-center gap-3">
          {typeof distanceMiles === "number" && distanceMiles > 0 && (
            <span>{Math.round(distanceMiles)} mi</span>
          )}
          {typeof stateCount === "number" && stateCount > 0 && (
            <span>
              {stateCount} state{stateCount === 1 ? "" : "s"}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}

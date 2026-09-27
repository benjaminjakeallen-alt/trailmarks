import Link from "next/link";
import Image from "next/image";
import { getDb } from "@/lib/db";
import { getAllMemories } from "@/lib/memories";
import { STATES_BY_CODE } from "@/lib/statesData";
import MapDashboard from "@/components/MapDashboard";

export const dynamic = "force-dynamic";

function getVisitedCodes(): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT state_code FROM state_visits WHERE visited = 1")
    .all() as unknown as { state_code: string }[];
  return rows.map((r) => r.state_code);
}

export default function HomePage() {
  const visitedCodes = getVisitedCodes();
  const recentMemories = getAllMemories().slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      <section className="mb-10 text-center sm:mb-14">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
          Every trip, remembered
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Your map of North America, one state at a time.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-base text-foreground-muted sm:text-lg">
          Mark off the states you&apos;ve visited, drop in the photos and stories from each trip,
          and watch your travel map fill in.
        </p>
        <Link
          href="/trips"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          Or start a trip and let Trailmarks draw the route for you →
        </Link>
      </section>

      <MapDashboard initialVisited={visitedCodes} />

      {recentMemories.length > 0 && (
        <section className="mt-16">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">Recent memories</h2>
            <Link href="/memories" className="text-sm font-medium text-accent hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentMemories.map((memory) => {
              const state = memory.stateCode ? STATES_BY_CODE[memory.stateCode] : undefined;
              const cover = memory.photos[0];
              const href = memory.stateCode
                ? `/states/${memory.stateCode.toLowerCase()}`
                : memory.tripId
                  ? `/trips/${memory.tripId}`
                  : "/memories";
              return (
                <Link
                  key={memory.id}
                  href={href}
                  className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] w-full bg-surface-muted">
                    {cover ? (
                      <Image
                        src={cover.url}
                        alt={memory.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">📍</div>
                    )}
                  </div>
                  <div className="p-3.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-accent">
                      {state?.name ?? "On the road"}
                    </p>
                    <p className="mt-0.5 truncate font-medium text-foreground">{memory.title}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

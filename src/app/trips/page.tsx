import { PlusIcon } from "@phosphor-icons/react/dist/ssr";
import { listTrips, getTrip } from "@/lib/trips";
import TripCard from "@/components/TripCard";
import RouteSketch from "@/components/trips/RouteSketch";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Panel";
import { WordReveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trips — Trailmarks" };

/** Keep card payloads small: a sketch never needs more than ~160 vertices. */
function downsample<T>(items: T[], max = 160): T[] {
  if (items.length <= max) return items;
  const step = (items.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => items[Math.round(i * step)]);
}

function bentoSpan(i: number, total: number) {
  if (i === 0) return total > 1 ? "md:col-span-4 md:row-span-2" : "md:col-span-6";
  if (i <= 2) return "md:col-span-2";
  return "md:col-span-3";
}

/** Recording first, then trips with a route (newest first), then plans — so the big slot always has a story. */
const STATUS_RANK = { active: 0, completed: 1, planned: 2 } as const;

export default async function TripsPage() {
  const trips = (await listTrips()).sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
  const details = await Promise.all(trips.map((t) => getTrip(t.id)));

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-8 sm:px-8 lg:pt-16">
      <header className="mb-8 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Trips</Eyebrow>
          <WordReveal
            text={"Roads you've\ndrawn."}
            className="mt-3 font-display text-[clamp(2.6rem,6vw,4.75rem)] leading-[0.95] tracking-[-0.04em] [&>span:last-child]:text-petrol"
          />
        </div>
        <ButtonLink href="/trips/new" icon={<PlusIcon size={16} weight="bold" />} className="self-start sm:hidden">
          New trip
        </ButtonLink>
      </header>

      {trips.length === 0 ? (
        <div className="grid grid-cols-1 items-center gap-8 rounded-[1.75rem] bg-elevated p-2 shadow-[var(--shadow-card)] ring-1 ring-line md:grid-cols-2">
          <div className="brand-gradient aspect-[16/10] overflow-hidden rounded-[1.4rem]">
            <RouteSketch points={[]} demo onPhoto className="h-full w-full" />
          </div>
          <div className="p-6 md:p-10">
            <h2 className="font-display text-3xl">Your first route starts here.</h2>
            <p className="mt-3 max-w-[40ch] leading-relaxed text-ink-2">
              Start a trip, hit record, and drive. Trailmarks traces the road as you go and claims every
              state you cross when you finish.
            </p>
            <div className="mt-6">
              <ButtonLink href="/trips/new" icon={<PlusIcon size={16} weight="bold" />}>
                Start a trip
              </ButtonLink>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid auto-rows-auto grid-cols-1 gap-4 md:grid-cols-6">
          {trips.map((trip, i) => {
            const detail = details[i];
            return (
              <div key={trip.id} className={bentoSpan(i, trips.length)}>
                <TripCard
                  trip={detail ? { ...trip, coverPhotoUrl: detail.coverPhotoUrl } : trip}
                  index={i}
                  featured={i === 0 && trips.length > 1}
                  wide={trips.length === 1}
                  points={downsample(detail?.points ?? []).map((p) => ({ lat: p.lat, lng: p.lng }))}
                  stateCodes={detail?.stateCodes ?? []}
                  distanceMiles={detail?.distanceMiles ?? 0}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

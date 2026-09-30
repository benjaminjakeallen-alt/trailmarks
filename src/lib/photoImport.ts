import { haversineMiles } from "@/lib/geo";
import { localDay, type PhotoMeta } from "@/lib/photoMeta";
import { findStateCodeForPoint } from "@/lib/stateLookup";
import { STATES_BY_CODE } from "@/lib/statesData";
import type { Memory } from "@/lib/types";

/**
 * Sorting a batch of photos into a trip's steps, by the time and place the
 * camera recorded. Pure functions, so the plan can be shown for review
 * before anything uploads.
 */

export interface ImportPhoto extends PhotoMeta {
  key: string;
  file: File;
  previewUrl: string;
}

export type ImportGroup =
  | { kind: "existing"; key: string; memory: Memory; photos: ImportPhoto[] }
  | {
      kind: "new";
      key: string;
      title: string;
      memoryDate: string | null;
      lat: number | null;
      lng: number | null;
      stateCode: string | null;
      photos: ImportPhoto[];
    }
  | { kind: "outside"; key: string; photos: ImportPhoto[] };

/** A photo within this distance of a step, on the same day, belongs to it. */
const STEP_RADIUS_MI = 5;
/** A new stop starts after this long without a photo… */
const CLUSTER_GAP_MS = 3 * 60 * 60 * 1000;
/** …or this far from the stop's first photo. */
const CLUSTER_RADIUS_MI = 8;
/** Photos this far outside the trip's dates aren't from the trip. */
const TRIP_SLACK_MS = 12 * 60 * 60 * 1000;

function stepDay(memory: Memory) {
  return memory.memoryDate?.slice(0, 10) ?? memory.createdAt.slice(0, 10);
}

/** The step a photo belongs to: same day, and nearby when both have GPS. Nearest wins. */
function matchStep(photo: ImportPhoto, steps: Memory[]): Memory | null {
  if (!photo.takenAt) return null;
  const day = localDay(photo.takenAt);
  let best: { memory: Memory; score: number } | null = null;
  for (const memory of steps) {
    if (stepDay(memory) !== day) continue;
    const hasBoth = photo.lat != null && photo.lng != null && memory.lat != null && memory.lng != null;
    const miles = hasBoth ? haversineMiles({ lat: photo.lat!, lng: photo.lng! }, { lat: memory.lat!, lng: memory.lng! }) : null;
    if (miles != null && miles > STEP_RADIUS_MI) continue;
    const score = miles ?? STEP_RADIUS_MI; // a GPS match beats a same-day guess
    if (!best || score < best.score) best = { memory, score };
  }
  return best?.memory ?? null;
}

function newStop(photos: ImportPhoto[], index: number): ImportGroup {
  const withGps = photos.filter((p) => p.lat != null && p.lng != null);
  const lat = withGps.length ? withGps.reduce((s, p) => s + p.lat!, 0) / withGps.length : null;
  const lng = withGps.length ? withGps.reduce((s, p) => s + p.lng!, 0) / withGps.length : null;
  const stateCode = lat != null && lng != null ? findStateCodeForPoint(lng, lat) : null;
  const first = photos.find((p) => p.takenAt)?.takenAt ?? null;
  const dayLabel = first?.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const place = stateCode ? STATES_BY_CODE[stateCode]?.name : null;
  const title = place ? `${place}${dayLabel ? `, ${dayLabel}` : ""}` : dayLabel ? `Stop on ${dayLabel}` : "More photos";
  return {
    kind: "new",
    key: `new-${index}`,
    title,
    memoryDate: first ? localDay(first) : null,
    lat,
    lng,
    stateCode,
    photos,
  };
}

/** Consecutive photos (by time) that stay close together become one stop. */
function clusterStops(photos: ImportPhoto[]): ImportPhoto[][] {
  const timed = photos.filter((p) => p.takenAt).sort((a, b) => a.takenAt!.getTime() - b.takenAt!.getTime());
  const clusters: ImportPhoto[][] = [];
  for (const photo of timed) {
    const current = clusters[clusters.length - 1];
    const last = current?.[current.length - 1];
    const anchor = current?.find((p) => p.lat != null);
    const gap = last ? photo.takenAt!.getTime() - last.takenAt!.getTime() : Infinity;
    const far =
      anchor && photo.lat != null && photo.lng != null
        ? haversineMiles({ lat: anchor.lat!, lng: anchor.lng! }, { lat: photo.lat, lng: photo.lng }) > CLUSTER_RADIUS_MI
        : false;
    if (!current || gap > CLUSTER_GAP_MS || far) clusters.push([photo]);
    else current.push(photo);
  }
  const untimed = photos.filter((p) => !p.takenAt);
  if (untimed.length) clusters.push(untimed);
  return clusters;
}

export function planImport(
  photos: ImportPhoto[],
  trip: { startedAt: string | null; endedAt: string | null },
  steps: Memory[],
): ImportGroup[] {
  const start = trip.startedAt ? Date.parse(trip.startedAt) - TRIP_SLACK_MS : -Infinity;
  const end = trip.endedAt ? Date.parse(trip.endedAt) + TRIP_SLACK_MS : Infinity;
  const inTrip = (p: ImportPhoto) => !p.takenAt || (p.takenAt.getTime() >= start && p.takenAt.getTime() <= end);

  const outside = photos.filter((p) => !inTrip(p));
  const byStep = new Map<number, ImportPhoto[]>();
  const unmatched: ImportPhoto[] = [];
  for (const photo of photos.filter(inTrip)) {
    const step = matchStep(photo, steps);
    if (step) byStep.set(step.id, [...(byStep.get(step.id) ?? []), photo]);
    else unmatched.push(photo);
  }

  const groups: ImportGroup[] = [
    ...steps
      .filter((s) => byStep.has(s.id))
      .map((memory): ImportGroup => ({ kind: "existing", key: `step-${memory.id}`, memory, photos: byStep.get(memory.id)! })),
    ...clusterStops(unmatched).map((cluster, i) => newStop(cluster, i)),
  ];
  if (outside.length) groups.push({ kind: "outside", key: "outside", photos: outside });
  return groups;
}

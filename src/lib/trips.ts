import { getSupabase, unwrap, getPublicPhotoUrl } from "@/lib/supabase";
import { getMemoriesForTrip } from "@/lib/memories";
import { findStateCodesForPoints } from "@/lib/stateLookup";
import { trackDistanceMiles } from "@/lib/geo";
import { mergeVisitedStates, getVisitedStateCodes, type VisitOwner } from "@/lib/stateVisits";
import type { Trip, TripDetail, TripPoint, TripStatus } from "@/lib/types";

interface TripRow {
  id: number;
  user_id: string | null;
  family_id: string | null;
  title: string;
  description: string | null;
  status: TripStatus;
  started_at: string | null;
  ended_at: string | null;
  cover_photo_id: number | null;
  created_at: string;
}

interface TripPointRow {
  id: number;
  lat: number;
  lng: number;
  recorded_at: string;
}

interface PhotoFileRow {
  file_name: string;
}

function toTrip(row: TripRow): Trip {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    coverPhotoId: row.cover_photo_id,
    coverPhotoUrl: null, // callers resolve this via resolveCoverPhotoUrl when needed
    createdAt: row.created_at,
  };
}

async function resolveCoverPhotoUrl(row: TripRow): Promise<string | null> {
  if (!row.cover_photo_id) return null;
  const supabase = getSupabase();
  const photo = unwrap(
    await supabase.from("photos").select("file_name").eq("id", row.cover_photo_id).maybeSingle(),
  ) as PhotoFileRow | null;
  return photo ? getPublicPhotoUrl(photo.file_name) : null;
}

function toTripPoint(row: TripPointRow): TripPoint {
  return { id: row.id, lat: row.lat, lng: row.lng, recordedAt: row.recorded_at };
}

function sortTripKey(row: TripRow): string {
  return row.started_at ?? row.created_at;
}

export async function listTrips(familyId: string): Promise<Trip[]> {
  const supabase = getSupabase();
  const rows = unwrap(await supabase.from("trips").select("*").eq("family_id", familyId)) as TripRow[];
  const sorted = [...rows].sort((a, b) => sortTripKey(b).localeCompare(sortTripKey(a)) || b.id - a.id);
  return Promise.all(
    sorted.map(async (row) => ({ ...toTrip(row), coverPhotoUrl: await resolveCoverPhotoUrl(row) })),
  );
}

export async function createTrip(
  owner: VisitOwner,
  input: { title: string; description: string | null },
): Promise<Trip> {
  const supabase = getSupabase();
  const row = unwrap(
    await supabase
      .from("trips")
      .insert({
        user_id: owner.userId,
        family_id: owner.familyId,
        title: input.title,
        description: input.description,
        status: "planned",
      })
      .select()
      .single(),
  ) as TripRow;
  return toTrip(row);
}

export async function getTripPoints(tripId: number): Promise<TripPoint[]> {
  const supabase = getSupabase();
  const rows = unwrap(
    await supabase
      .from("trip_points")
      .select("*")
      .eq("trip_id", tripId)
      .order("recorded_at", { ascending: true })
      .order("id", { ascending: true }),
  ) as TripPointRow[];
  return rows.map(toTripPoint);
}

export async function addTripPoint(
  tripId: number,
  point: { lat: number; lng: number; recordedAt: string },
): Promise<TripPoint> {
  const supabase = getSupabase();
  const row = unwrap(
    await supabase
      .from("trip_points")
      .insert({ trip_id: tripId, lat: point.lat, lng: point.lng, recorded_at: point.recordedAt })
      .select()
      .single(),
  ) as TripPointRow;
  return toTripPoint(row);
}

/** Who owns a trip and which family can see it, for permission checks. */
export async function getTripOwner(tripId: number): Promise<VisitOwner | null> {
  const row = unwrap(
    await getSupabase().from("trips").select("user_id, family_id").eq("id", tripId).maybeSingle(),
  ) as { user_id: string | null; family_id: string | null } | null;
  return row?.user_id && row.family_id ? { userId: row.user_id, familyId: row.family_id } : null;
}

/** The trip, if it belongs to this family; otherwise null, as if it didn't exist. */
export async function getTrip(tripId: number, familyId: string): Promise<TripDetail | null> {
  const supabase = getSupabase();
  const row = unwrap(
    await supabase.from("trips").select("*").eq("id", tripId).eq("family_id", familyId).maybeSingle(),
  ) as TripRow | null;
  if (!row) return null;

  const [points, memories, coverPhotoUrl] = await Promise.all([
    getTripPoints(tripId),
    getMemoriesForTrip(tripId),
    resolveCoverPhotoUrl(row),
  ]);
  const stateCodes = findStateCodesForPoints(points.map((p) => [p.lng, p.lat]));
  const distanceMiles = trackDistanceMiles(points);

  // No explicit cover yet? Use the first photo from the trip's steps.
  const firstStepPhoto = memories.find((m) => m.photos.length > 0)?.photos[0].url ?? null;

  return {
    ...toTrip(row),
    coverPhotoUrl: coverPhotoUrl ?? firstStepPhoto,
    points,
    memories,
    stateCodes,
    distanceMiles,
  };
}

/** Marks the trip active and starts the clock, if not already started. */
export async function startTrip(tripId: number): Promise<void> {
  const supabase = getSupabase();
  const row = unwrap(
    await supabase.from("trips").select("started_at").eq("id", tripId).maybeSingle(),
  ) as { started_at: string | null } | null;

  await supabase
    .from("trips")
    .update({ status: "active", started_at: row?.started_at ?? new Date().toISOString() })
    .eq("id", tripId);
}

/**
 * Ends the trip, auto-detects every state its recorded points passed
 * through, and merges those into the trip owner's state_visits (without
 * clobbering an earlier first-visited date for a state already marked).
 */
export async function finishTrip(
  tripId: number,
  owner: VisitOwner,
): Promise<{ trip: TripDetail; newStateCodes: string[] }> {
  const supabase = getSupabase();
  const points = await getTripPoints(tripId);
  const stateCodes = findStateCodesForPoints(points.map((p) => [p.lng, p.lat]));

  const tripRow = unwrap(
    await supabase.from("trips").select("started_at").eq("id", tripId).maybeSingle(),
  ) as { started_at: string | null } | null;
  const visitDate = (tripRow?.started_at ?? new Date().toISOString()).slice(0, 10);

  const existing = new Set(await getVisitedStateCodes(owner.userId));
  const newStateCodes = stateCodes.filter((c) => !existing.has(c));

  await mergeVisitedStates(owner, stateCodes, visitDate);

  await supabase
    .from("trips")
    .update({
      status: "completed",
      // A trip finished without a formal start still gets a start date: its first point.
      started_at: tripRow?.started_at ?? points[0]?.recordedAt ?? new Date().toISOString(),
      ended_at: new Date().toISOString(),
    })
    .eq("id", tripId);

  const trip = (await getTrip(tripId, owner.familyId))!;
  return { trip, newStateCodes };
}

export async function deleteTrip(tripId: number): Promise<void> {
  // memories.trip_id -> ON DELETE SET NULL and trip_points.trip_id -> ON
  // DELETE CASCADE are enforced by Postgres, so a plain delete is enough.
  const supabase = getSupabase();
  await supabase.from("trips").delete().eq("id", tripId);
}

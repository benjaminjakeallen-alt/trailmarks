import { getDb } from "@/lib/db";
import { getMemoriesForTrip } from "@/lib/memories";
import { findStateCodesForPoints } from "@/lib/stateLookup";
import { trackDistanceMiles } from "@/lib/geo";
import type { Trip, TripDetail, TripPoint, TripStatus } from "@/lib/types";

interface TripRow {
  id: number;
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

function toTrip(row: TripRow): Trip {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    coverPhotoId: row.cover_photo_id,
    coverPhotoUrl: row.cover_photo_id ? `/api/photos/${row.cover_photo_id}` : null,
    createdAt: row.created_at,
  };
}

function toTripPoint(row: TripPointRow): TripPoint {
  return { id: row.id, lat: row.lat, lng: row.lng, recordedAt: row.recorded_at };
}

export function listTrips(): Trip[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM trips ORDER BY COALESCE(started_at, created_at) DESC, id DESC")
    .all() as unknown as TripRow[];
  return rows.map(toTrip);
}

export function createTrip(input: { title: string; description: string | null }): Trip {
  const db = getDb();
  const result = db
    .prepare("INSERT INTO trips (title, description, status) VALUES (?, ?, 'planned')")
    .run(input.title, input.description);
  const row = db
    .prepare("SELECT * FROM trips WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as unknown as TripRow;
  return toTrip(row);
}

export function getTripPoints(tripId: number): TripPoint[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM trip_points WHERE trip_id = ? ORDER BY recorded_at ASC, id ASC")
    .all(tripId) as unknown as TripPointRow[];
  return rows.map(toTripPoint);
}

export function addTripPoint(tripId: number, point: { lat: number; lng: number; recordedAt: string }): TripPoint {
  const db = getDb();
  const result = db
    .prepare("INSERT INTO trip_points (trip_id, lat, lng, recorded_at) VALUES (?, ?, ?, ?)")
    .run(tripId, point.lat, point.lng, point.recordedAt);
  return {
    id: Number(result.lastInsertRowid),
    lat: point.lat,
    lng: point.lng,
    recordedAt: point.recordedAt,
  };
}

export function getTrip(tripId: number): TripDetail | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM trips WHERE id = ?").get(tripId) as unknown as
    | TripRow
    | undefined;
  if (!row) return null;

  const points = getTripPoints(tripId);
  const memories = getMemoriesForTrip(tripId);
  const stateCodes = findStateCodesForPoints(points.map((p) => [p.lng, p.lat]));
  const distanceMiles = trackDistanceMiles(points);

  return { ...toTrip(row), points, memories, stateCodes, distanceMiles };
}

/** Marks the trip active and starts the clock, if not already started. */
export function startTrip(tripId: number): void {
  const db = getDb();
  db.prepare(
    `UPDATE trips SET status = 'active', started_at = COALESCE(started_at, datetime('now'))
     WHERE id = ?`,
  ).run(tripId);
}

/**
 * Ends the trip, auto-detects every state its recorded points passed
 * through, and merges those into state_visits (without clobbering an
 * earlier first-visited date for a state already marked).
 */
export function finishTrip(tripId: number): { trip: TripDetail; newStateCodes: string[] } {
  const db = getDb();
  const points = getTripPoints(tripId);
  const stateCodes = findStateCodesForPoints(points.map((p) => [p.lng, p.lat]));

  const tripRow = db.prepare("SELECT started_at FROM trips WHERE id = ?").get(tripId) as unknown as
    | { started_at: string | null }
    | undefined;
  const visitDate = tripRow?.started_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  const existing = new Set(
    (
      db.prepare("SELECT state_code FROM state_visits WHERE visited = 1").all() as unknown as {
        state_code: string;
      }[]
    ).map((r) => r.state_code),
  );
  const newStateCodes = stateCodes.filter((c) => !existing.has(c));

  const upsert = db.prepare(
    `INSERT INTO state_visits (state_code, visited, first_visited_on, updated_at)
     VALUES (?, 1, ?, datetime('now'))
     ON CONFLICT(state_code) DO UPDATE SET
       visited = 1,
       first_visited_on = COALESCE(state_visits.first_visited_on, excluded.first_visited_on),
       updated_at = datetime('now')`,
  );
  for (const code of stateCodes) upsert.run(code, visitDate);

  db.prepare("UPDATE trips SET status = 'completed', ended_at = datetime('now') WHERE id = ?").run(
    tripId,
  );

  const trip = getTrip(tripId)!;
  return { trip, newStateCodes };
}

export function deleteTrip(tripId: number): void {
  const db = getDb();
  db.prepare("UPDATE memories SET trip_id = NULL WHERE trip_id = ?").run(tripId);
  db.prepare("DELETE FROM trip_points WHERE trip_id = ?").run(tripId);
  db.prepare("DELETE FROM trips WHERE id = ?").run(tripId);
}

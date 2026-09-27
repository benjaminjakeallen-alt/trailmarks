import { getDb } from "@/lib/db";
import type { Memory, Photo } from "@/lib/types";

interface MemoryRow {
  id: number;
  state_code: string | null;
  trip_id: number | null;
  lat: number | null;
  lng: number | null;
  title: string;
  body: string | null;
  memory_date: string | null;
  created_at: string;
}

interface PhotoRow {
  id: number;
  state_code: string | null;
  memory_id: number | null;
  file_name: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

function toPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    stateCode: row.state_code,
    memoryId: row.memory_id,
    fileName: row.file_name,
    caption: row.caption,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
    url: `/api/photos/${row.id}`,
  };
}

function toMemory(row: MemoryRow, photos: Photo[]): Memory {
  return {
    id: row.id,
    stateCode: row.state_code,
    tripId: row.trip_id,
    lat: row.lat,
    lng: row.lng,
    title: row.title,
    body: row.body,
    memoryDate: row.memory_date,
    createdAt: row.created_at,
    photos,
  };
}

function attachPhotos(memoryRows: MemoryRow[], photoRows: PhotoRow[]): Memory[] {
  const photosByMemory = new Map<number, Photo[]>();
  for (const row of photoRows) {
    if (row.memory_id == null) continue;
    const photo = toPhoto(row);
    if (!photosByMemory.has(row.memory_id)) photosByMemory.set(row.memory_id, []);
    photosByMemory.get(row.memory_id)!.push(photo);
  }
  return memoryRows.map((row) => toMemory(row, photosByMemory.get(row.id) ?? []));
}

export function getMemoriesForState(stateCode: string): Memory[] {
  const db = getDb();
  const memoryRows = db
    .prepare(
      "SELECT * FROM memories WHERE state_code = ? ORDER BY COALESCE(memory_date, created_at) DESC, id DESC",
    )
    .all(stateCode) as unknown as MemoryRow[];

  const photoRows = db
    .prepare("SELECT * FROM photos WHERE state_code = ? ORDER BY created_at ASC, id ASC")
    .all(stateCode) as unknown as PhotoRow[];

  return attachPhotos(memoryRows, photoRows);
}

export function getMemoriesForTrip(tripId: number): Memory[] {
  const db = getDb();
  const memoryRows = db
    .prepare(
      "SELECT * FROM memories WHERE trip_id = ? ORDER BY COALESCE(memory_date, created_at) ASC, id ASC",
    )
    .all(tripId) as unknown as MemoryRow[];

  const photoRows = db
    .prepare(
      `SELECT photos.* FROM photos
       JOIN memories ON memories.id = photos.memory_id
       WHERE memories.trip_id = ?
       ORDER BY photos.created_at ASC, photos.id ASC`,
    )
    .all(tripId) as unknown as PhotoRow[];

  return attachPhotos(memoryRows, photoRows);
}

export function getAllMemories(): Memory[] {
  const db = getDb();
  const memoryRows = db
    .prepare("SELECT * FROM memories ORDER BY COALESCE(memory_date, created_at) DESC, id DESC")
    .all() as unknown as MemoryRow[];

  const photoRows = db
    .prepare("SELECT * FROM photos ORDER BY created_at ASC, id ASC")
    .all() as unknown as PhotoRow[];

  return attachPhotos(memoryRows, photoRows);
}

export function getAllPhotosLoose(): Photo[] {
  const db = getDb();
  const photoRows = db
    .prepare("SELECT * FROM photos ORDER BY created_at DESC, id DESC")
    .all() as unknown as PhotoRow[];
  return photoRows.map(toPhoto);
}

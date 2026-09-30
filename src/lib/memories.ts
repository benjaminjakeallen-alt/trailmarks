import { getSupabase, unwrap, photoUrl, voiceUrl } from "@/lib/supabase";
import type { Memory, Photo } from "@/lib/types";

interface MemoryRow {
  id: number;
  user_id: string | null;
  state_code: string | null;
  trip_id: number | null;
  lat: number | null;
  lng: number | null;
  title: string;
  body: string | null;
  memory_date: string | null;
  audio_file: string | null;
  audio_seconds: number | null;
  created_at: string;
}

interface PhotoRow {
  id: number;
  user_id: string | null;
  state_code: string | null;
  memory_id: number | null;
  file_name: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  taken_at: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

function toPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    userId: row.user_id,
    stateCode: row.state_code,
    memoryId: row.memory_id,
    fileName: row.file_name,
    caption: row.caption,
    width: row.width,
    height: row.height,
    takenAt: row.taken_at,
    lat: row.lat,
    lng: row.lng,
    createdAt: row.created_at,
    url: photoUrl(row.file_name),
  };
}

function toMemory(row: MemoryRow, photos: Photo[]): Memory {
  return {
    id: row.id,
    userId: row.user_id,
    stateCode: row.state_code,
    tripId: row.trip_id,
    lat: row.lat,
    lng: row.lng,
    title: row.title,
    body: row.body,
    memoryDate: row.memory_date,
    createdAt: row.created_at,
    photos,
    audioUrl: voiceUrl(row.audio_file),
    audioSeconds: row.audio_seconds,
  };
}

function sortKey(row: MemoryRow): string {
  return row.memory_date ?? row.created_at;
}

function attachPhotos(memoryRows: MemoryRow[], photoRows: PhotoRow[], order: "asc" | "desc"): Memory[] {
  const photosByMemory = new Map<number, Photo[]>();
  for (const row of photoRows) {
    if (row.memory_id == null) continue;
    if (!photosByMemory.has(row.memory_id)) photosByMemory.set(row.memory_id, []);
    photosByMemory.get(row.memory_id)!.push(toPhoto(row));
  }

  const sorted = [...memoryRows].sort((a, b) => {
    const cmp = sortKey(a).localeCompare(sortKey(b)) || a.id - b.id;
    return order === "asc" ? cmp : -cmp;
  });

  return sorted.map((row) => toMemory(row, photosByMemory.get(row.id) ?? []));
}

/** Photos for these memories, in one query. */
async function photosFor(memoryRows: MemoryRow[]): Promise<PhotoRow[]> {
  const ids = memoryRows.map((m) => m.id);
  if (ids.length === 0) return [];
  return unwrap(await getSupabase().from("photos").select("*").in("memory_id", ids)) as PhotoRow[];
}

/** Everyone in the family's memories of a state, newest first. */
export async function getMemoriesForState(familyId: string, stateCode: string): Promise<Memory[]> {
  const memoryRows = unwrap(
    await getSupabase().from("memories").select("*").eq("family_id", familyId).eq("state_code", stateCode),
  ) as MemoryRow[];
  return attachPhotos(memoryRows, await photosFor(memoryRows), "desc");
}

/** A trip's steps, in order. Callers check the trip belongs to the viewer's family. */
export async function getMemoriesForTrip(tripId: number): Promise<Memory[]> {
  const memoryRows = unwrap(await getSupabase().from("memories").select("*").eq("trip_id", tripId)) as MemoryRow[];
  return attachPhotos(memoryRows, await photosFor(memoryRows), "asc");
}

export async function getAllMemories(familyId: string): Promise<Memory[]> {
  const memoryRows = unwrap(await getSupabase().from("memories").select("*").eq("family_id", familyId)) as MemoryRow[];
  return attachPhotos(memoryRows, await photosFor(memoryRows), "desc");
}

/** Just enough of a memory to check who may change it. */
export async function getMemoryOwner(
  memoryId: number,
): Promise<{ userId: string | null; familyId: string | null } | null> {
  const row = unwrap(
    await getSupabase().from("memories").select("user_id, family_id").eq("id", memoryId).maybeSingle(),
  ) as { user_id: string | null; family_id: string | null } | null;
  return row ? { userId: row.user_id, familyId: row.family_id } : null;
}

import { getSupabase, unwrap, getPublicPhotoUrl } from "@/lib/supabase";
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
    url: getPublicPhotoUrl(row.file_name),
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

export async function getMemoriesForState(stateCode: string): Promise<Memory[]> {
  const supabase = getSupabase();
  const memoryRows = unwrap(
    await supabase.from("memories").select("*").eq("state_code", stateCode),
  ) as MemoryRow[];
  const photoRows = unwrap(
    await supabase.from("photos").select("*").eq("state_code", stateCode),
  ) as PhotoRow[];
  return attachPhotos(memoryRows, photoRows, "desc");
}

export async function getMemoriesForTrip(tripId: number): Promise<Memory[]> {
  const supabase = getSupabase();
  const memoryRows = unwrap(
    await supabase.from("memories").select("*").eq("trip_id", tripId),
  ) as MemoryRow[];

  const memoryIds = memoryRows.map((m) => m.id);
  const photoRows =
    memoryIds.length === 0
      ? []
      : ((unwrap(
          await supabase.from("photos").select("*").in("memory_id", memoryIds),
        ) as PhotoRow[]));

  return attachPhotos(memoryRows, photoRows, "asc");
}

export async function getAllMemories(): Promise<Memory[]> {
  const supabase = getSupabase();
  const memoryRows = unwrap(await supabase.from("memories").select("*")) as MemoryRow[];
  const photoRows = unwrap(await supabase.from("photos").select("*")) as PhotoRow[];
  return attachPhotos(memoryRows, photoRows, "desc");
}

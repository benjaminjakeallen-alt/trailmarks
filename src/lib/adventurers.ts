import { getSupabase, unwrap, avatarUrl } from "@/lib/supabase";

/** AI-illustrated adventurers each person can make (about a cent each). */
export const MAX_ADVENTURERS = 5;

export interface Adventurer {
  id: number;
  url: string;
  fileName: string;
}

/** The person's finished adventurers, oldest first, and how many tries are left. */
export async function listAdventurers(userId: string): Promise<{ adventurers: Adventurer[]; left: number }> {
  const rows = unwrap(
    await getSupabase()
      .from("adventurers")
      .select("id, file_name")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ) as { id: number; file_name: string | null }[];
  const done = rows.filter((r) => r.file_name);
  return {
    adventurers: done.map((r) => ({ id: r.id, fileName: r.file_name!, url: avatarUrl(r.file_name)! })),
    // Reserved-but-unfinished rows count too, so two quick taps can't overspend.
    left: Math.max(0, MAX_ADVENTURERS - rows.length),
  };
}

/** Holds one of the five tries before the AI call. Null when they're all used. */
export async function reserveAdventurer(userId: string): Promise<number | null> {
  const { left } = await listAdventurers(userId);
  if (left <= 0) return null;
  const row = unwrap(
    await getSupabase().from("adventurers").insert({ user_id: userId }).select("id").single(),
  ) as { id: number };
  return row.id;
}

export async function finishAdventurer(id: number, fileName: string) {
  unwrap(await getSupabase().from("adventurers").update({ file_name: fileName }).eq("id", id).select("id"));
}

/** A failed call hands the try back. */
export async function releaseAdventurer(id: number) {
  await getSupabase().from("adventurers").delete().eq("id", id);
}

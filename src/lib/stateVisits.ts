import { getSupabase, unwrap } from "@/lib/supabase";
import type { FamilyVisit, StateVisit } from "@/lib/types";

/** Whose visit it is: the person, and the family it's shared with. */
export interface VisitOwner {
  userId: string;
  familyId: string;
}

interface StateVisitRow {
  user_id: string;
  state_code: string;
  visited: boolean;
  first_visited_on: string | null;
}

const COLUMNS = "user_id, state_code, visited, first_visited_on";

function toStateVisit(row: StateVisitRow): StateVisit {
  return { stateCode: row.state_code, visited: row.visited, firstVisitedOn: row.first_visited_on };
}

/** Every claim by everyone in the family: one row per person per state. */
export async function getFamilyVisits(familyId: string): Promise<FamilyVisit[]> {
  const rows = unwrap(
    await getSupabase().from("state_visits").select(COLUMNS).eq("family_id", familyId).eq("visited", true),
  ) as StateVisitRow[];
  return rows.map((row) => ({ userId: row.user_id, stateCode: row.state_code, firstVisitedOn: row.first_visited_on }));
}

export async function getVisitedStateCodes(userId: string): Promise<string[]> {
  const rows = unwrap(
    await getSupabase().from("state_visits").select("state_code").eq("user_id", userId).eq("visited", true),
  ) as { state_code: string }[];
  return rows.map((r) => r.state_code);
}

export async function getStateVisit(userId: string, stateCode: string): Promise<StateVisit | null> {
  const row = unwrap(
    await getSupabase()
      .from("state_visits")
      .select(COLUMNS)
      .eq("user_id", userId)
      .eq("state_code", stateCode)
      .maybeSingle(),
  ) as StateVisitRow | null;
  return row ? toStateVisit(row) : null;
}

/**
 * Marks a state visited/unvisited for one person. Preserves an existing
 * first_visited_on unless the state has never been recorded before -- a
 * plain upsert can't express "keep the old value" with a literal payload,
 * so this reads the current row first.
 */
export async function setStateVisited(
  owner: VisitOwner,
  stateCode: string,
  visited: boolean,
  firstVisitedOn: string | null,
): Promise<StateVisit> {
  const existing = await getStateVisit(owner.userId, stateCode);
  const resolvedDate = existing?.firstVisitedOn ?? firstVisitedOn;

  const row = unwrap(
    await getSupabase()
      .from("state_visits")
      .upsert(
        {
          user_id: owner.userId,
          family_id: owner.familyId,
          state_code: stateCode,
          visited,
          first_visited_on: resolvedDate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,state_code" },
      )
      .select(COLUMNS)
      .single(),
  ) as StateVisitRow;
  return toStateVisit(row);
}

/** Marks every given state visited for one person, without clobbering an existing first-visited date. */
export async function mergeVisitedStates(owner: VisitOwner, stateCodes: string[], visitDate: string): Promise<void> {
  for (const code of stateCodes) {
    await setStateVisited(owner, code, true, visitDate);
  }
}

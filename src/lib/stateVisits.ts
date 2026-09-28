import { getSupabase, unwrap } from "@/lib/supabase";
import type { StateVisit } from "@/lib/types";

interface StateVisitRow {
  state_code: string;
  visited: boolean;
  first_visited_on: string | null;
}

function toStateVisit(row: StateVisitRow): StateVisit {
  return { stateCode: row.state_code, visited: row.visited, firstVisitedOn: row.first_visited_on };
}

export async function getVisitedStateCodes(): Promise<string[]> {
  const supabase = getSupabase();
  const rows = unwrap(
    await supabase.from("state_visits").select("state_code").eq("visited", true),
  ) as { state_code: string }[];
  return rows.map((r) => r.state_code);
}

export async function getStateVisit(stateCode: string): Promise<StateVisit | null> {
  const supabase = getSupabase();
  const row = unwrap(
    await supabase.from("state_visits").select("*").eq("state_code", stateCode).maybeSingle(),
  ) as StateVisitRow | null;
  return row ? toStateVisit(row) : null;
}

export async function getAllVisits(): Promise<StateVisit[]> {
  const supabase = getSupabase();
  const rows = unwrap(
    await supabase.from("state_visits").select("*").eq("visited", true),
  ) as StateVisitRow[];
  return rows.map(toStateVisit);
}

/**
 * Marks a state visited/unvisited. Preserves an existing first_visited_on
 * unless the state has never been recorded before -- a plain upsert can't
 * express "keep the old value" with a literal payload, so this reads the
 * current row first.
 */
export async function setStateVisited(
  stateCode: string,
  visited: boolean,
  firstVisitedOn: string | null,
): Promise<StateVisit> {
  const supabase = getSupabase();

  const existing = unwrap(
    await supabase
      .from("state_visits")
      .select("first_visited_on")
      .eq("state_code", stateCode)
      .maybeSingle(),
  ) as { first_visited_on: string | null } | null;

  const resolvedDate = existing?.first_visited_on ?? firstVisitedOn;

  const row = unwrap(
    await supabase
      .from("state_visits")
      .upsert(
        { state_code: stateCode, visited, first_visited_on: resolvedDate, updated_at: new Date().toISOString() },
        { onConflict: "state_code" },
      )
      .select()
      .single(),
  ) as StateVisitRow;

  return toStateVisit(row);
}

/** Marks every given state visited, without clobbering an existing first-visited date. */
export async function mergeVisitedStates(stateCodes: string[], visitDate: string): Promise<void> {
  for (const code of stateCodes) {
    await setStateVisited(code, true, visitDate);
  }
}

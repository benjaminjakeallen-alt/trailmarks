import { getSupabase, unwrap } from "@/lib/supabase";
import type { VisitOwner } from "@/lib/stateVisits";
import type { FamilyCountryVisit } from "@/lib/types";

interface Row {
  user_id: string;
  country_code: string;
  first_visited_on: string | null;
}

/** Every country claim by everyone in the family. (The US is derived from state claims, not stored.) */
export async function getFamilyCountryVisits(familyId: string): Promise<FamilyCountryVisit[]> {
  const rows = unwrap(
    await getSupabase().from("country_visits").select("user_id, country_code, first_visited_on").eq("family_id", familyId),
  ) as Row[];
  return rows.map((r) => ({ userId: r.user_id, countryCode: r.country_code, firstVisitedOn: r.first_visited_on }));
}

/** Claims (keeping the first date if it was claimed before) or unclaims a country for one person. */
export async function setCountryVisited(owner: VisitOwner, code: string, visited: boolean, date: string | null) {
  const supabase = getSupabase();
  if (!visited) {
    unwrap(await supabase.from("country_visits").delete().eq("user_id", owner.userId).eq("country_code", code).select("id"));
    return;
  }
  const existing = unwrap(
    await supabase
      .from("country_visits")
      .select("id")
      .eq("user_id", owner.userId)
      .eq("country_code", code)
      .maybeSingle(),
  );
  if (existing) return;
  unwrap(
    await supabase
      .from("country_visits")
      .insert({ user_id: owner.userId, family_id: owner.familyId, country_code: code, first_visited_on: date })
      .select("id")
      .single(),
  );
}

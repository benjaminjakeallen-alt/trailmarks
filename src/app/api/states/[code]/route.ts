import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { STATES_BY_CODE } from "@/lib/statesData";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  if (!STATES_BY_CODE[code]) {
    return NextResponse.json({ error: "Unknown state code" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const visited = Boolean(body.visited);
  const firstVisitedOn: string | null =
    typeof body.firstVisitedOn === "string" && body.firstVisitedOn ? body.firstVisitedOn : null;

  const db = getDb();
  db.prepare(
    `INSERT INTO state_visits (state_code, visited, first_visited_on, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(state_code) DO UPDATE SET
       visited = excluded.visited,
       first_visited_on = COALESCE(excluded.first_visited_on, state_visits.first_visited_on),
       updated_at = datetime('now')`,
  ).run(code, visited ? 1 : 0, firstVisitedOn);

  return NextResponse.json({ stateCode: code, visited, firstVisitedOn });
}

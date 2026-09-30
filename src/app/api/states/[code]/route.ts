import { NextRequest, NextResponse } from "next/server";
import { apiViewer } from "@/lib/auth";
import { setStateVisited } from "@/lib/stateVisits";
import { STATES_BY_CODE } from "@/lib/statesData";

/** Claims or unclaims a state for the signed-in person only. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;

  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  if (!STATES_BY_CODE[code]) {
    return NextResponse.json({ error: "Unknown state code" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const visited = Boolean(body.visited);
  const firstVisitedOn: string | null =
    typeof body.firstVisitedOn === "string" && body.firstVisitedOn ? body.firstVisitedOn : null;

  const result = await setStateVisited(viewer, code, visited, firstVisitedOn);
  return NextResponse.json({ stateCode: code, visited: result.visited, firstVisitedOn: result.firstVisitedOn });
}

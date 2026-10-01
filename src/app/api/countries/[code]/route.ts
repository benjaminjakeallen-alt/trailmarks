import { NextRequest, NextResponse } from "next/server";
import { apiViewer } from "@/lib/auth";
import { COUNTRIES_BY_CODE } from "@/lib/countriesData";
import { setCountryVisited } from "@/lib/countryVisits";

/** Claims or unclaims a country for the signed-in person. The US follows state claims instead. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const code = (await params).code.toUpperCase();
  if (!COUNTRIES_BY_CODE[code] || code === "US") {
    return NextResponse.json({ error: "Unknown country" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const date = typeof body.firstVisitedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.firstVisitedOn) ? body.firstVisitedOn : null;
  await setCountryVisited(viewer, code, Boolean(body.visited), date);
  return NextResponse.json({ countryCode: code, visited: Boolean(body.visited) });
}

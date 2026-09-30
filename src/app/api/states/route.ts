import { NextResponse } from "next/server";
import { apiViewer } from "@/lib/auth";
import { getFamilyVisits } from "@/lib/stateVisits";

export async function GET() {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  return NextResponse.json({ visits: await getFamilyVisits(viewer.familyId) });
}

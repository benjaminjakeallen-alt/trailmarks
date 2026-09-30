import { NextRequest, NextResponse } from "next/server";
import { apiViewer } from "@/lib/auth";
import { createTrip, listTrips } from "@/lib/trips";

export async function GET() {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  return NextResponse.json({ trips: await listTrips(viewer.familyId) });
}

export async function POST(req: NextRequest) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const trip = await createTrip(viewer, { title, description: description || null });
  return NextResponse.json({ trip }, { status: 201 });
}

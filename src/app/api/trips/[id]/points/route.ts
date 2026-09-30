import { NextRequest, NextResponse } from "next/server";
import { apiViewer, forbidden, notFound } from "@/lib/auth";
import { addTripPoint, getTripOwner, getTripPoints } from "@/lib/trips";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;

  const tripId = Number((await params).id);
  if (!Number.isInteger(tripId)) {
    return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });
  }
  const owner = await getTripOwner(tripId);
  if (!owner || owner.familyId !== viewer.familyId) return notFound();
  return NextResponse.json({ points: await getTripPoints(tripId) });
}

/** Only the person recording the trip can add to its route. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;

  const tripId = Number((await params).id);
  if (!Number.isInteger(tripId)) {
    return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });
  }
  const owner = await getTripOwner(tripId);
  if (!owner || owner.familyId !== viewer.familyId) return notFound();
  if (owner.userId !== viewer.userId) return forbidden("Only the person recording this trip can add to its route");

  const body = await req.json().catch(() => ({}));
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }
  const recordedAt =
    typeof body.recordedAt === "string" && body.recordedAt ? body.recordedAt : new Date().toISOString();

  const point = await addTripPoint(tripId, { lat, lng, recordedAt });
  return NextResponse.json({ point }, { status: 201 });
}

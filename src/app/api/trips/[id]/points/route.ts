import { NextRequest, NextResponse } from "next/server";
import { addTripPoint, getTripPoints } from "@/lib/trips";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tripId = Number(id);
  if (!Number.isInteger(tripId)) {
    return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });
  }
  return NextResponse.json({ points: getTripPoints(tripId) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tripId = Number(id);
  if (!Number.isInteger(tripId)) {
    return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }
  const recordedAt =
    typeof body.recordedAt === "string" && body.recordedAt ? body.recordedAt : new Date().toISOString();

  const point = addTripPoint(tripId, { lat, lng, recordedAt });
  return NextResponse.json({ point }, { status: 201 });
}

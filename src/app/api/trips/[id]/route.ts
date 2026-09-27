import { NextRequest, NextResponse } from "next/server";
import { deleteTrip, finishTrip, getTrip, startTrip } from "@/lib/trips";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tripId = Number(id);
  if (!Number.isInteger(tripId)) {
    return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });
  }
  const trip = getTrip(tripId);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ trip });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tripId = Number(id);
  if (!Number.isInteger(tripId)) {
    return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  if (body.action === "start") {
    startTrip(tripId);
    return NextResponse.json({ trip: getTrip(tripId) });
  }

  if (body.action === "finish") {
    const { trip, newStateCodes } = finishTrip(tripId);
    return NextResponse.json({ trip, newStateCodes });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tripId = Number(id);
  if (!Number.isInteger(tripId)) {
    return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });
  }
  deleteTrip(tripId);
  return NextResponse.json({ ok: true });
}

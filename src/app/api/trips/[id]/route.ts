import { NextRequest, NextResponse } from "next/server";
import { apiViewer, forbidden, notFound } from "@/lib/auth";
import { deleteTrip, finishTrip, getTrip, getTripOwner, startTrip } from "@/lib/trips";
import type { Viewer } from "@/lib/types";

async function tripIdFrom(params: Promise<{ id: string }>) {
  const tripId = Number((await params).id);
  return Number.isInteger(tripId) ? tripId : null;
}

/** The family can see a trip; only the person who recorded it can change it. */
async function checkOwner(tripId: number, viewer: Viewer) {
  const owner = await getTripOwner(tripId);
  if (!owner || owner.familyId !== viewer.familyId) return notFound();
  if (owner.userId !== viewer.userId) return forbidden("Only the person recording this trip can change it");
  return null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const tripId = await tripIdFrom(params);
  if (tripId == null) return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });

  const trip = await getTrip(tripId, viewer.familyId);
  if (!trip) return notFound();
  return NextResponse.json({ trip });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const tripId = await tripIdFrom(params);
  if (tripId == null) return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });

  const denied = await checkOwner(tripId, viewer);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));

  if (body.action === "start") {
    await startTrip(tripId);
    return NextResponse.json({ trip: await getTrip(tripId, viewer.familyId) });
  }

  if (body.action === "finish") {
    const { trip, newStateCodes } = await finishTrip(tripId, viewer);
    return NextResponse.json({ trip, newStateCodes });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const tripId = await tripIdFrom(params);
  if (tripId == null) return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });

  const denied = await checkOwner(tripId, viewer);
  if (denied) return denied;

  await deleteTrip(tripId);
  return NextResponse.json({ ok: true });
}

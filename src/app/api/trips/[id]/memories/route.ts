import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getMemoriesForTrip } from "@/lib/memories";
import { findStateCodeForPoint } from "@/lib/stateLookup";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tripId = Number(id);
  if (!Number.isInteger(tripId)) {
    return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });
  }
  return NextResponse.json({ memories: getMemoriesForTrip(tripId) });
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
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const memoryBody = typeof body.body === "string" ? body.body.trim() : "";
  const memoryDate = typeof body.memoryDate === "string" && body.memoryDate ? body.memoryDate : null;
  const lat = body.lat != null ? Number(body.lat) : null;
  const lng = body.lng != null ? Number(body.lng) : null;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const stateCode = lat != null && lng != null ? findStateCodeForPoint(lng, lat) : null;

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO memories (state_code, trip_id, lat, lng, title, body, memory_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(stateCode, tripId, lat, lng, title, memoryBody || null, memoryDate);

  const memories = getMemoriesForTrip(tripId);
  const created = memories.find((m) => m.id === Number(result.lastInsertRowid));

  return NextResponse.json({ memory: created }, { status: 201 });
}

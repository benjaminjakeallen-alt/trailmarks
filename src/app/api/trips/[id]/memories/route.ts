import { NextRequest, NextResponse } from "next/server";
import { getSupabase, unwrap } from "@/lib/supabase";
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
  return NextResponse.json({ memories: await getMemoriesForTrip(tripId) });
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

  const supabase = getSupabase();
  const inserted = unwrap(
    await supabase
      .from("memories")
      .insert({
        state_code: stateCode,
        trip_id: tripId,
        lat,
        lng,
        title,
        body: memoryBody || null,
        memory_date: memoryDate,
      })
      .select("id")
      .single(),
  ) as { id: number };

  const memories = await getMemoriesForTrip(tripId);
  const created = memories.find((m) => m.id === inserted.id);

  return NextResponse.json({ memory: created }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { createTrip, listTrips } from "@/lib/trips";

export async function GET() {
  return NextResponse.json({ trips: await listTrips() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const trip = await createTrip({ title, description: description || null });
  return NextResponse.json({ trip }, { status: 201 });
}

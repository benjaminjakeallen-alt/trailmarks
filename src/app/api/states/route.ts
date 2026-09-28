import { NextResponse } from "next/server";
import { getAllVisits } from "@/lib/stateVisits";

export async function GET() {
  return NextResponse.json({ visits: await getAllVisits() });
}

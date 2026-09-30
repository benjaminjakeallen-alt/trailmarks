import { NextResponse } from "next/server";
import { apiViewer } from "@/lib/auth";
import { getAllMemories } from "@/lib/memories";

export async function GET() {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  return NextResponse.json({ memories: await getAllMemories(viewer.familyId) });
}

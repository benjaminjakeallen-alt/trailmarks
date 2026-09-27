import { NextResponse } from "next/server";
import { getAllMemories } from "@/lib/memories";

export async function GET() {
  return NextResponse.json({ memories: getAllMemories() });
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabase, unwrap } from "@/lib/supabase";
import { getMemoriesForState } from "@/lib/memories";
import { setStateVisited } from "@/lib/stateVisits";
import { STATES_BY_CODE } from "@/lib/statesData";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  if (!STATES_BY_CODE[code]) {
    return NextResponse.json({ error: "Unknown state code" }, { status: 404 });
  }
  return NextResponse.json({ memories: await getMemoriesForState(code) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  if (!STATES_BY_CODE[code]) {
    return NextResponse.json({ error: "Unknown state code" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const memoryBody = typeof body.body === "string" ? body.body.trim() : "";
  const memoryDate = typeof body.memoryDate === "string" && body.memoryDate ? body.memoryDate : null;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const supabase = getSupabase();
  const inserted = unwrap(
    await supabase
      .from("memories")
      .insert({ state_code: code, title, body: memoryBody || null, memory_date: memoryDate })
      .select("id")
      .single(),
  ) as { id: number };

  // A memory implicitly counts as a visit, if the state wasn't marked yet.
  await setStateVisited(code, true, memoryDate);

  const memories = await getMemoriesForState(code);
  const created = memories.find((m) => m.id === inserted.id);

  return NextResponse.json({ memory: created }, { status: 201 });
}

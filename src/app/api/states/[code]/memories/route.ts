import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getMemoriesForState } from "@/lib/memories";
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
  return NextResponse.json({ memories: getMemoriesForState(code) });
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

  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO memories (state_code, title, body, memory_date) VALUES (?, ?, ?, ?)",
    )
    .run(code, title, memoryBody || null, memoryDate);

  // A memory implicitly counts as a visit, if the state wasn't marked yet.
  db.prepare(
    `INSERT INTO state_visits (state_code, visited, first_visited_on, updated_at)
     VALUES (?, 1, ?, datetime('now'))
     ON CONFLICT(state_code) DO UPDATE SET
       visited = 1,
       first_visited_on = COALESCE(state_visits.first_visited_on, excluded.first_visited_on),
       updated_at = datetime('now')`,
  ).run(code, memoryDate);

  const memories = getMemoriesForState(code);
  const created = memories.find((m) => m.id === Number(result.lastInsertRowid));

  return NextResponse.json({ memory: created }, { status: 201 });
}

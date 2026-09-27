import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { StateVisit } from "@/lib/types";

interface VisitRow {
  state_code: string;
  visited: number;
  first_visited_on: string | null;
}

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare("SELECT state_code, visited, first_visited_on FROM state_visits WHERE visited = 1")
    .all() as unknown as VisitRow[];

  const visits: StateVisit[] = rows.map((r) => ({
    stateCode: r.state_code,
    visited: !!r.visited,
    firstVisitedOn: r.first_visited_on,
  }));

  return NextResponse.json({ visits });
}

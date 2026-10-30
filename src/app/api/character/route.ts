import { NextRequest, NextResponse } from "next/server";
import { apiViewer } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { defaultLook, parseLook } from "@/lib/look";

/** Saves the viewer's 3D character: POST /api/character { body, hat, skin, hair, outfit }. */
export async function POST(req: NextRequest) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Send a character" }, { status: 400 });
  // Only known fields and colors survive; anything else falls back to their default.
  const look = parseLook(body, defaultLook({ userId: viewer.userId, color: viewer.color }));
  const { error } = await getSupabase().from("profiles").update({ character: look }).eq("user_id", viewer.userId);
  if (error) return NextResponse.json({ error: "Couldn't save your character" }, { status: 500 });
  return NextResponse.json({ look });
}

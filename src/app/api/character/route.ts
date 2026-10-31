import { NextRequest, NextResponse } from "next/server";
import { apiViewer } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { storeAvatar } from "@/lib/avatarStore";
import { defaultLook, parseLook } from "@/lib/look";

const MAX_PORTRAIT = 2_000_000;

/**
 * Saves the viewer's 3D character and its portrait (their avatar everywhere):
 * POST /api/character, multipart with `look` (JSON) and `portrait` (an image).
 */
export async function POST(req: NextRequest) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const form = await req.formData().catch(() => null);
  const raw = form?.get("look");
  let parsed: unknown = null;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  if (!parsed || typeof parsed !== "object") return NextResponse.json({ error: "Send a character" }, { status: 400 });
  // Only known fields and colors survive; anything else falls back to their default.
  const look = parseLook(parsed, defaultLook({ userId: viewer.userId, color: viewer.color }));

  const portrait = form?.get("portrait");
  if (portrait !== null && portrait !== undefined && !(portrait instanceof File && portrait.type.startsWith("image/") && portrait.size <= MAX_PORTRAIT)) {
    return NextResponse.json({ error: "The portrait has to be an image" }, { status: 400 });
  }

  const { error } = await getSupabase().from("profiles").update({ character: look }).eq("user_id", viewer.userId);
  if (error) return NextResponse.json({ error: "Couldn't save your character" }, { status: 500 });

  let avatarUrl: string | null = null;
  if (portrait instanceof File) {
    try {
      avatarUrl = await storeAvatar(viewer.userId, Buffer.from(await portrait.arrayBuffer()));
    } catch {
      // The character is saved; the old avatar stays until the next save.
      return NextResponse.json({ look, avatarUrl: null, warning: "Saved, but the portrait didn't upload" });
    }
  }
  return NextResponse.json({ look, avatarUrl });
}

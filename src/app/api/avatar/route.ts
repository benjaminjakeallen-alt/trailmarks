import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { apiViewer } from "@/lib/auth";
import { AVATARS_BUCKET, avatarUrl, getSupabase } from "@/lib/supabase";
import { listAdventurers } from "@/lib/adventurers";

const SIZE = 512;

async function currentAvatar(userId: string) {
  const { data } = await getSupabase().from("profiles").select("avatar_file").eq("user_id", userId).maybeSingle();
  return (data?.avatar_file as string | null) ?? null;
}

/** The old avatar file goes, unless it's one of their adventurers (kept so they can switch back). */
async function removeOld(userId: string, previous: string | null) {
  if (!previous) return;
  const { adventurers } = await listAdventurers(userId);
  if (adventurers.some((a) => a.fileName === previous)) return;
  await getSupabase().storage.from(AVATARS_BUCKET).remove([previous]);
}

/** Their adventurers and how many of the five are left: GET /api/avatar. */
export async function GET() {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const { adventurers, left } = await listAdventurers(viewer.userId);
  return NextResponse.json({ adventurers: adventurers.map(({ id, url }) => ({ id, url })), left });
}

/** Saves the viewer's photo badge (never the selfie), or switches to one of their adventurers. */
export async function POST(req: NextRequest) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const supabase = getSupabase();

  // { adventurer: id }: wear one of the adventurers they've made.
  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    const { adventurers } = await listAdventurers(viewer.userId);
    const pick = adventurers.find((a) => a.id === Number(body.adventurer));
    if (!pick) return NextResponse.json({ error: "That adventurer isn't yours" }, { status: 404 });
    const previous = await currentAvatar(viewer.userId);
    await supabase.from("profiles").update({ avatar_file: pick.fileName }).eq("user_id", viewer.userId);
    await removeOld(viewer.userId, previous);
    return NextResponse.json({ avatarUrl: pick.url });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Send an image" }, { status: 400 });
  }

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await file.arrayBuffer()))
      .resize(SIZE, SIZE, { fit: "cover" })
      .webp({ quality: 88, alphaQuality: 90 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "That image couldn't be processed" }, { status: 400 });
  }

  const name = `${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(name, webp, { contentType: "image/webp" });
  if (error) return NextResponse.json({ error: "Could not store the avatar" }, { status: 500 });

  const previous = await currentAvatar(viewer.userId);
  const { error: updateError } = await supabase.from("profiles").update({ avatar_file: name }).eq("user_id", viewer.userId);
  if (updateError) {
    await supabase.storage.from(AVATARS_BUCKET).remove([name]);
    return NextResponse.json({ error: "Could not save the avatar" }, { status: 500 });
  }
  await removeOld(viewer.userId, previous);
  return NextResponse.json({ avatarUrl: avatarUrl(name) }, { status: 201 });
}

/** Back to initials. */
export async function DELETE() {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const previous = await currentAvatar(viewer.userId);
  await getSupabase().from("profiles").update({ avatar_file: null }).eq("user_id", viewer.userId);
  await removeOld(viewer.userId, previous);
  return NextResponse.json({ ok: true });
}

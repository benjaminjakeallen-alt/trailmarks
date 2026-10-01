import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { apiViewer } from "@/lib/auth";
import { AVATARS_BUCKET, avatarUrl, getSupabase } from "@/lib/supabase";

const SIZE = 512;

async function files(userId: string) {
  const { data } = await getSupabase()
    .from("profiles")
    .select("avatar_file, illustrated_file")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    avatar: (data?.avatar_file as string | null) ?? null,
    illustrated: (data?.illustrated_file as string | null) ?? null,
  };
}

/** The old avatar file goes, unless it's the person's one illustration (kept so they can switch back). */
async function removeOld(previous: string | null, keep: string | null) {
  if (previous && previous !== keep) await getSupabase().storage.from(AVATARS_BUCKET).remove([previous]);
}

/** Saves the viewer's adventurer avatar (the finished photo badge, never the selfie), or switches to their illustration. */
export async function POST(req: NextRequest) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const supabase = getSupabase();

  // { use: "illustration" }: wear the illustrated adventurer made earlier.
  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    if (body.use !== "illustration") return NextResponse.json({ error: "Unknown request" }, { status: 400 });
    const { avatar, illustrated } = await files(viewer.userId);
    if (!illustrated) return NextResponse.json({ error: "No illustration yet" }, { status: 404 });
    await supabase.from("profiles").update({ avatar_file: illustrated }).eq("user_id", viewer.userId);
    await removeOld(avatar, illustrated);
    return NextResponse.json({ avatarUrl: avatarUrl(illustrated) });
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

  const previous = await files(viewer.userId);
  const { error: updateError } = await supabase.from("profiles").update({ avatar_file: name }).eq("user_id", viewer.userId);
  if (updateError) {
    await supabase.storage.from(AVATARS_BUCKET).remove([name]);
    return NextResponse.json({ error: "Could not save the avatar" }, { status: 500 });
  }
  await removeOld(previous.avatar, previous.illustrated);
  return NextResponse.json({ avatarUrl: avatarUrl(name) }, { status: 201 });
}

/** Back to initials. */
export async function DELETE() {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const previous = await files(viewer.userId);
  await getSupabase().from("profiles").update({ avatar_file: null }).eq("user_id", viewer.userId);
  await removeOld(previous.avatar, previous.illustrated);
  return NextResponse.json({ ok: true });
}

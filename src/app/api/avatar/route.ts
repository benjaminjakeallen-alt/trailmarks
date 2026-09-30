import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { apiViewer } from "@/lib/auth";
import { AVATARS_BUCKET, avatarUrl, getSupabase } from "@/lib/supabase";

const SIZE = 512;

async function currentFile(userId: string) {
  const { data } = await getSupabase().from("profiles").select("avatar_file").eq("user_id", userId).maybeSingle();
  return (data?.avatar_file as string | null) ?? null;
}

/** Saves the viewer's adventurer avatar (the finished image, never the selfie). */
export async function POST(req: NextRequest) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
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

  const supabase = getSupabase();
  const name = `${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(name, webp, { contentType: "image/webp" });
  if (error) return NextResponse.json({ error: "Could not store the avatar" }, { status: 500 });

  const previous = await currentFile(viewer.userId);
  const { error: updateError } = await supabase.from("profiles").update({ avatar_file: name }).eq("user_id", viewer.userId);
  if (updateError) {
    await supabase.storage.from(AVATARS_BUCKET).remove([name]);
    return NextResponse.json({ error: "Could not save the avatar" }, { status: 500 });
  }
  if (previous) await supabase.storage.from(AVATARS_BUCKET).remove([previous]);
  return NextResponse.json({ avatarUrl: avatarUrl(name) }, { status: 201 });
}

/** Back to initials. */
export async function DELETE() {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;
  const supabase = getSupabase();
  const previous = await currentFile(viewer.userId);
  await supabase.from("profiles").update({ avatar_file: null }).eq("user_id", viewer.userId);
  if (previous) await supabase.storage.from(AVATARS_BUCKET).remove([previous]);
  return NextResponse.json({ ok: true });
}

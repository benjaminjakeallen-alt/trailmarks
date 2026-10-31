import crypto from "node:crypto";
import sharp from "sharp";
import { AVATARS_BUCKET, avatarUrl, getSupabase } from "@/lib/supabase";

const SIZE = 512;

/**
 * Stores an image as someone's avatar (their character's portrait): resized to a
 * 512px WebP in the private avatars bucket, then swapped in on their profile. The
 * old file goes, unless it's one of the AI adventurers people made before the
 * character maker (those stay so their files keep resolving).
 */
export async function storeAvatar(userId: string, image: Buffer): Promise<string> {
  const webp = await sharp(image).resize(SIZE, SIZE, { fit: "cover" }).webp({ quality: 88, alphaQuality: 90 }).toBuffer();
  const supabase = getSupabase();
  const name = `${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(name, webp, { contentType: "image/webp" });
  if (error) throw new Error("Could not store the avatar");

  const { data: before } = await supabase.from("profiles").select("avatar_file").eq("user_id", userId).maybeSingle();
  const previous = (before?.avatar_file as string | null) ?? null;
  const { error: updateError } = await supabase.from("profiles").update({ avatar_file: name }).eq("user_id", userId);
  if (updateError) {
    await supabase.storage.from(AVATARS_BUCKET).remove([name]);
    throw new Error("Could not save the avatar");
  }
  if (previous) {
    const { data: kept } = await supabase.from("adventurers").select("id").eq("file_name", previous).maybeSingle();
    if (!kept) await supabase.storage.from(AVATARS_BUCKET).remove([previous]);
  }
  return avatarUrl(name)!;
}

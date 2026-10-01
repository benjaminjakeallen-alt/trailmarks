import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/auth";
import { AVATARS_BUCKET, getSupabase } from "@/lib/supabase";

/** An adventurer avatar, for people in the same family as its owner. Names are random, so cache forever. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[0-9a-f-]{36}\.webp$/.test(file)) return new NextResponse(null, { status: 404 });

  const auth = await createAuthClient();
  const { data: claims } = await auth.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return new NextResponse(null, { status: 401 });

  const supabase = getSupabase();
  // Whose is it: someone wearing it, or one of someone's saved adventurers.
  const [{ data: wearer }, { data: made }, { data: viewer }] = await Promise.all([
    supabase.from("profiles").select("family_id").eq("avatar_file", file).limit(1).maybeSingle(),
    supabase.from("adventurers").select("user_id").eq("file_name", file).maybeSingle(),
    supabase.from("profiles").select("family_id").eq("user_id", userId).maybeSingle(),
  ]);
  let ownerFamily = wearer?.family_id as string | undefined;
  if (!ownerFamily && made?.user_id) {
    const { data: maker } = await supabase.from("profiles").select("family_id").eq("user_id", made.user_id).maybeSingle();
    ownerFamily = maker?.family_id;
  }
  if (!ownerFamily || !viewer || ownerFamily !== viewer.family_id) return new NextResponse(null, { status: 404 });

  const { data: blob, error } = await supabase.storage.from(AVATARS_BUCKET).download(file);
  if (error || !blob) return new NextResponse(null, { status: 404 });
  const body = new Uint8Array(await blob.arrayBuffer());
  return new NextResponse(body, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(body.length),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

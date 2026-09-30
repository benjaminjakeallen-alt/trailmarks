import { NextRequest, NextResponse } from "next/server";
import { apiViewer, forbidden, notFound } from "@/lib/auth";
import { getSupabase, unwrap, PHOTOS_BUCKET } from "@/lib/supabase";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;

  const { id } = await params;
  const photoId = Number(id);
  if (!Number.isInteger(photoId)) {
    return NextResponse.json({ error: "Invalid photo id" }, { status: 400 });
  }

  const supabase = getSupabase();
  const row = unwrap(
    await supabase.from("photos").select("file_name, user_id, family_id").eq("id", photoId).maybeSingle(),
  ) as { file_name: string; user_id: string | null; family_id: string | null } | null;

  if (!row || row.family_id !== viewer.familyId) return notFound();
  if (row.user_id !== viewer.userId) return forbidden("Only the person who added this photo can delete it");

  await supabase.storage.from(PHOTOS_BUCKET).remove([row.file_name]);
  await supabase.from("photos").delete().eq("id", photoId);

  return NextResponse.json({ ok: true });
}

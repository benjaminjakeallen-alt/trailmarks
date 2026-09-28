import { NextRequest, NextResponse } from "next/server";
import { getSupabase, unwrap, PHOTOS_BUCKET } from "@/lib/supabase";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const photoId = Number(id);
  if (!Number.isInteger(photoId)) {
    return NextResponse.json({ error: "Invalid photo id" }, { status: 400 });
  }

  const supabase = getSupabase();
  const row = unwrap(
    await supabase.from("photos").select("file_name").eq("id", photoId).maybeSingle(),
  ) as { file_name: string } | null;

  if (row) {
    await supabase.storage.from(PHOTOS_BUCKET).remove([row.file_name]);
  }
  await supabase.from("photos").delete().eq("id", photoId);

  return NextResponse.json({ ok: true });
}

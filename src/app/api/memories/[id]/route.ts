import { NextRequest, NextResponse } from "next/server";
import { getSupabase, unwrap, PHOTOS_BUCKET } from "@/lib/supabase";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const memoryId = Number(id);
  if (!Number.isInteger(memoryId)) {
    return NextResponse.json({ error: "Invalid memory id" }, { status: 400 });
  }

  const supabase = getSupabase();
  const photos = unwrap(
    await supabase.from("photos").select("file_name").eq("memory_id", memoryId),
  ) as { file_name: string }[];

  if (photos.length > 0) {
    await supabase.storage.from(PHOTOS_BUCKET).remove(photos.map((p) => p.file_name));
  }

  await supabase.from("photos").delete().eq("memory_id", memoryId);
  await supabase.from("memories").delete().eq("id", memoryId);

  return NextResponse.json({ ok: true });
}

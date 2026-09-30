import { NextRequest, NextResponse } from "next/server";
import { apiViewer, forbidden, notFound } from "@/lib/auth";
import { getSupabase, unwrap, PHOTOS_BUCKET } from "@/lib/supabase";
import { getMemoryOwner } from "@/lib/memories";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;

  const { id } = await params;
  const memoryId = Number(id);
  if (!Number.isInteger(memoryId)) {
    return NextResponse.json({ error: "Invalid memory id" }, { status: 400 });
  }

  const owner = await getMemoryOwner(memoryId);
  if (!owner || owner.familyId !== viewer.familyId) return notFound();
  if (owner.userId !== viewer.userId) return forbidden("Only the person who wrote this can delete it");

  const supabase = getSupabase();
  const photos = unwrap(await supabase.from("photos").select("file_name").eq("memory_id", memoryId)) as {
    file_name: string;
  }[];

  if (photos.length > 0) {
    await supabase.storage.from(PHOTOS_BUCKET).remove(photos.map((p) => p.file_name));
  }

  await supabase.from("photos").delete().eq("memory_id", memoryId);
  await supabase.from("memories").delete().eq("id", memoryId);

  return NextResponse.json({ ok: true });
}

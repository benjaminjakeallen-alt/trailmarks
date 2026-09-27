import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getDb, getPhotosDir } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const memoryId = Number(id);
  if (!Number.isInteger(memoryId)) {
    return NextResponse.json({ error: "Invalid memory id" }, { status: 400 });
  }

  const db = getDb();
  const photos = db
    .prepare("SELECT file_name FROM photos WHERE memory_id = ?")
    .all(memoryId) as unknown as { file_name: string }[];

  for (const photo of photos) {
    const filePath = path.join(getPhotosDir(), photo.file_name);
    fs.rm(filePath, { force: true }, () => {});
  }

  db.prepare("DELETE FROM photos WHERE memory_id = ?").run(memoryId);
  db.prepare("DELETE FROM memories WHERE id = ?").run(memoryId);

  return NextResponse.json({ ok: true });
}

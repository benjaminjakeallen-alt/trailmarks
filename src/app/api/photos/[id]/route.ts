import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getDb, getPhotosDir } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const photoId = Number(id);
  if (!Number.isInteger(photoId)) {
    return NextResponse.json({ error: "Invalid photo id" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare("SELECT file_name FROM photos WHERE id = ?")
    .get(photoId) as { file_name: string } | undefined;

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const data = await fs.readFile(path.join(getPhotosDir(), row.file_name));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Photo file missing" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const photoId = Number(id);
  if (!Number.isInteger(photoId)) {
    return NextResponse.json({ error: "Invalid photo id" }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare("SELECT file_name FROM photos WHERE id = ?")
    .get(photoId) as { file_name: string } | undefined;

  if (row) {
    await fs.rm(path.join(getPhotosDir(), row.file_name), { force: true });
  }
  db.prepare("DELETE FROM photos WHERE id = ?").run(photoId);

  return NextResponse.json({ ok: true });
}

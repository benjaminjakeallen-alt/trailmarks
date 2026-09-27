import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { getDb, getPhotosDir } from "@/lib/db";
import { STATES_BY_CODE } from "@/lib/statesData";

const MAX_DIMENSION = 2400;

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  const stateCodeRaw = String(form.get("stateCode") || "").toUpperCase();
  const stateCode = STATES_BY_CODE[stateCodeRaw] ? stateCodeRaw : null;
  const memoryIdRaw = form.get("memoryId");
  const caption = typeof form.get("caption") === "string" ? String(form.get("caption")).trim() : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are supported" }, { status: 400 });
  }

  const memoryId = memoryIdRaw ? Number(memoryIdRaw) : null;

  let webpBuffer: Buffer;
  let metadata: { width?: number; height?: number };
  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const resized = sharp(inputBuffer).rotate().resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    });
    webpBuffer = await resized.webp({ quality: 82 }).toBuffer();
    metadata = await sharp(webpBuffer).metadata();
  } catch {
    return NextResponse.json({ error: "That image couldn't be processed" }, { status: 400 });
  }

  const fileName = `${crypto.randomUUID()}.webp`;
  const dir = getPhotosDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), webpBuffer);

  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO photos (state_code, memory_id, file_name, caption, width, height) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(stateCode, memoryId, fileName, caption || null, metadata.width ?? null, metadata.height ?? null);

  return NextResponse.json(
    {
      photo: {
        id: Number(result.lastInsertRowid),
        stateCode,
        memoryId,
        fileName,
        caption: caption || null,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        url: `/api/photos/${Number(result.lastInsertRowid)}`,
      },
    },
    { status: 201 },
  );
}

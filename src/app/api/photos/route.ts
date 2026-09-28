import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import sharp from "sharp";
import { getSupabase, unwrap, getPublicPhotoUrl, PHOTOS_BUCKET } from "@/lib/supabase";
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
  const supabase = getSupabase();

  const { error: uploadError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(fileName, webpBuffer, { contentType: "image/webp" });
  if (uploadError) {
    return NextResponse.json({ error: "Could not store photo" }, { status: 500 });
  }

  try {
    const row = unwrap(
      await supabase
        .from("photos")
        .insert({
          state_code: stateCode,
          memory_id: memoryId,
          file_name: fileName,
          caption: caption || null,
          width: metadata.width ?? null,
          height: metadata.height ?? null,
        })
        .select()
        .single(),
    ) as {
      id: number;
      state_code: string | null;
      memory_id: number | null;
      file_name: string;
      caption: string | null;
      width: number | null;
      height: number | null;
    };

    return NextResponse.json(
      {
        photo: {
          id: row.id,
          stateCode: row.state_code,
          memoryId: row.memory_id,
          fileName: row.file_name,
          caption: row.caption,
          width: row.width,
          height: row.height,
          url: getPublicPhotoUrl(row.file_name),
        },
      },
      { status: 201 },
    );
  } catch {
    await supabase.storage.from(PHOTOS_BUCKET).remove([fileName]);
    return NextResponse.json({ error: "Could not save photo" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import sharp from "sharp";
import { apiViewer, forbidden, notFound } from "@/lib/auth";
import { getSupabase, unwrap, photoUrl, PHOTOS_BUCKET } from "@/lib/supabase";
import { getMemoryOwner } from "@/lib/memories";
import { STATES_BY_CODE } from "@/lib/statesData";

const MAX_DIMENSION = 2400;

export async function POST(req: NextRequest) {
  const viewer = await apiViewer();
  if (viewer instanceof NextResponse) return viewer;

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  const stateCodeRaw = String(form.get("stateCode") || "").toUpperCase();
  const stateCode = STATES_BY_CODE[stateCodeRaw] ? stateCodeRaw : null;
  const memoryIdRaw = form.get("memoryId");
  const caption = typeof form.get("caption") === "string" ? String(form.get("caption")).trim() : null;
  // Camera metadata read in the browser (the WebP re-encode below strips EXIF).
  const takenAtRaw = String(form.get("takenAt") || "");
  const takenAt = takenAtRaw && !Number.isNaN(Date.parse(takenAtRaw)) ? new Date(takenAtRaw).toISOString() : null;
  const latNum = Number(form.get("lat"));
  const lngNum = Number(form.get("lng"));
  const hasGps =
    form.get("lat") !== null &&
    form.get("lng") !== null &&
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    Math.abs(latNum) <= 90 &&
    Math.abs(lngNum) <= 180;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are supported" }, { status: 400 });
  }

  const memoryId = memoryIdRaw ? Number(memoryIdRaw) : null;
  if (memoryId != null) {
    const owner = Number.isInteger(memoryId) ? await getMemoryOwner(memoryId) : null;
    if (!owner || owner.familyId !== viewer.familyId) return notFound("That memory doesn't exist");
    if (owner.userId !== viewer.userId) return forbidden("You can only add photos to your own memories");
  }

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
          user_id: viewer.userId,
          family_id: viewer.familyId,
          state_code: stateCode,
          memory_id: memoryId,
          file_name: fileName,
          caption: caption || null,
          width: metadata.width ?? null,
          height: metadata.height ?? null,
          taken_at: takenAt,
          lat: hasGps ? latNum : null,
          lng: hasGps ? lngNum : null,
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
      taken_at: string | null;
      lat: number | null;
      lng: number | null;
      created_at: string;
    };

    return NextResponse.json(
      {
        photo: {
          id: row.id,
          userId: viewer.userId,
          stateCode: row.state_code,
          memoryId: row.memory_id,
          fileName: row.file_name,
          caption: row.caption,
          width: row.width,
          height: row.height,
          takenAt: row.taken_at,
          lat: row.lat,
          lng: row.lng,
          createdAt: row.created_at,
          url: photoUrl(row.file_name),
        },
      },
      { status: 201 },
    );
  } catch {
    await supabase.storage.from(PHOTOS_BUCKET).remove([fileName]);
    return NextResponse.json({ error: "Could not save photo" }, { status: 500 });
  }
}
